import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Pokemon, PokemonType } from '../../models/pokemon';
import { finalize, forkJoin } from 'rxjs'; // Import forkJoin

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isLoading" class="d-flex justify-content-center my-5">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="ms-2">Loading Pokemons...</p>
    </div>
    
    <div *ngIf="error" class="alert alert-danger text-center my-3">
        {{ error }}
        <div class="mt-2">
            <button class="btn btn-outline-danger btn-sm" (click)="loadData()">Retry</button>
        </div>
    </div>

    <div class="row fade-in" *ngIf="!isLoading && !error">
      <div class="col-md-4 mb-3" *ngFor="let p of pokemons">
        <div class="card h-100 shadow-sm">
          <img [src]="p.image" class="card-img-top" style="height: 150px; object-fit: contain; padding: 10px; background: #f8f9fa;">
          <div class="card-body">
            <h5 class="card-title text-center">{{ p.name }}</h5>
            
            <div class="mb-2">
                <label class="form-label small">Type</label>
                <select [(ngModel)]="p.type_id" class="form-select form-select-sm" [disabled]="updatingId === p.id">
                    <option *ngFor="let t of types" [value]="t.id">{{ t.name }}</option>
                </select>
            </div>

            <div class="mb-2">
              <label class="form-label small">Power</label>
              <input type="number" [(ngModel)]="p.power" class="form-control form-control-sm" [disabled]="updatingId === p.id">
            </div>
            <div class="mb-2">
              <label class="form-label small">Life</label>
              <input type="number" [(ngModel)]="p.life" class="form-control form-control-sm" [disabled]="updatingId === p.id">
            </div>
            <div class="d-grid">
                <button class="btn btn-primary btn-sm" (click)="save(p)" [disabled]="updatingId === p.id">
                    <span *ngIf="updatingId === p.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ updatingId === p.id ? 'Updating...' : 'Update' }}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PokemonListComponent implements OnInit {
  pokemons: Pokemon[] = [];
  types: PokemonType[] = [];
  isLoading = true;
  updatingId: string | null = null;
  error: string | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.error = null;
    
    // Use forkJoin to load both pokemons and types
    forkJoin({
        pokemons: this.api.getPokemons(),
        types: this.api.getPokemonTypes()
    })
    .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
    }))
    .subscribe({
        next: (result) => {
            this.pokemons = result.pokemons;
            this.types = result.types;
        },
        error: (err) => {
            console.error('Error loading data', err);
            this.error = 'Failed to load Pokemons or Types.';
        }
    });
  }

  save(p: Pokemon) {
    this.updatingId = p.id;
    // Include type_id in the update payload
    this.api.updatePokemon(p.id, { power: p.power, life: p.life, type_id: p.type_id })
        .pipe(finalize(() => this.updatingId = null))
        .subscribe({
            next: (updatedPokemon) => {
               // Update local copy if needed (e.g. backend returns updated object)
               // The select is already bound, so UI updates automatically if p.type_id changed
            },
            error: (err) => {
                alert('Update failed: ' + (err.error?.error || 'Unknown error'));
            }
        });
  }
}