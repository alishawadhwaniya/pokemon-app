import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Pokemon, Team } from '../../models/pokemon';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-team-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isLoading" class="d-flex justify-content-center my-5">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>

    <div *ngIf="error" class="alert alert-danger text-center my-3">
        {{ error }}
        <div class="mt-2">
            <button class="btn btn-outline-danger btn-sm" (click)="refresh()">Retry</button>
        </div>
    </div>

    <div class="row fade-in" *ngIf="!isLoading && !error">
      <div class="col-md-5">
        <h4>Create Team (Select 6)</h4>
        <div class="input-group mb-3">
             <input type="text" [(ngModel)]="newTeamName" placeholder="Team Name" class="form-control" [disabled]="isCreating">
        </div>
        
        <ul class="list-group mb-3 shadow-sm" style="max-height: 400px; overflow: auto;">
            <li *ngFor="let p of allPokemons" class="list-group-item d-flex justify-content-between align-items-center cursor-pointer"
                [class.active]="selection.includes(p.id)" 
                [class.disabled]="isCreating"
                (click)="toggleSelection(p.id)"
                style="cursor: pointer;">
                <span>
                    <img [src]="p.image" style="width: 30px; margin-right: 10px;">
                    {{ p.name }} <small class="text-muted">(Pw: {{p.power}})</small>
                </span>
                <span *ngIf="selection.includes(p.id)" class="badge bg-light text-dark">Selected</span>
            </li>
        </ul>
        <button class="btn btn-success w-100" [disabled]="selection.length !== 6 || !newTeamName || isCreating" (click)="createTeam()">
            <span *ngIf="isCreating" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ isCreating ? 'Creating Team...' : 'Create Team' }}
        </button>
      </div>

      <div class="col-md-7">
        <h4>Existing Teams (By Power)</h4>
        <div *ngIf="teams.length === 0" class="alert alert-info">No teams created yet.</div>
        <div *ngFor="let t of teams" class="card mb-3 shadow-sm">
            <div class="card-header d-flex justify-content-between bg-white">
                <span class="fw-bold">{{ t.team_name }}</span>
                <span class="badge bg-primary">Total Power: {{ t.total_power }}</span>
            </div>
            <div class="card-body">
                <div class="d-flex flex-wrap gap-2">
                    <div *ngFor="let p of t.pokemons" class="text-center" style="width: 60px;">
                        <img [src]="p.image" title="{{p.name}}" style="width: 50px; height: 50px; object-fit: contain;">
                        <div style="font-size: 10px;">{{p.name}}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  `
})
export class TeamBuilderComponent implements OnInit {
  allPokemons: Pokemon[] = [];
  teams: Team[] = [];
  selection: string[] = [];
  newTeamName = '';
  isLoading = true;
  isCreating = false;
  error: string | null = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.isLoading = true;
    this.error = null;
    forkJoin({
        pokemons: this.api.getPokemons(),
        teams: this.api.getTeams()
    })
    .pipe(finalize(() => this.isLoading = false))
    .subscribe({
        next: ({pokemons, teams}) => {
            this.allPokemons = pokemons;
            this.teams = teams;
        },
        error: (err) => this.error = 'Failed to load data. Please ensure backend is running.'
    });
  }

  toggleSelection(id: string) {
    if (this.isCreating) return;
    if (this.selection.includes(id)) {
      this.selection = this.selection.filter(x => x !== id);
    } else {
      if (this.selection.length < 6) this.selection.push(id);
    }
  }

  createTeam() {
    this.isCreating = true;
    this.api.createTeam(this.newTeamName, this.selection)
        .pipe(finalize(() => this.isCreating = false))
        .subscribe(() => {
            this.newTeamName = '';
            this.selection = [];
            this.refresh();
            // Removed alert for smoothness, or use a toast service
        });
  }
}