import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Team, Pokemon } from '../../models/pokemon';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface BattlePokemon extends Pokemon {
  currentHp: number;
  status: 'active' | 'fainted' | 'waiting';
  maxHp: number;
}

interface BattleState {
  round: number;
  teamA: BattlePokemon[];
  teamB: BattlePokemon[];
  activeAIndex: number;
  activeBIndex: number;
  logMessage?: string;
  winner?: string;
  logs?: any[]; 
}

@Component({
  selector: 'app-battle-arena',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .battle-container {
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        background: linear-gradient(to bottom, #e0eafc, #cfdef3);
        min-height: 600px;
    }
    
    .roster-row {
        background-color: #000;
        padding: 10px;
        display: flex;
        justify-content: center;
        gap: 15px;
    }
    
    .roster-slot {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #555;
        overflow: hidden;
        background: #333;
        position: relative;
    }
    
    .roster-slot.active {
        border-color: #0d6efd; /* Bootstrap primary blue */
        transform: scale(1.1);
        box-shadow: 0 0 10px #0d6efd;
    }

    .roster-slot.fainted {
        opacity: 0.5;
        filter: grayscale(100%);
    }

    .roster-slot img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .battle-stage {
        padding: 20px;
        position: relative;
        min-height: 400px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .pokemon-display {
        text-align: center;
        position: relative;
        width: 40%;
    }

    .pokemon-image-lg {
        width: 200px;
        height: 200px;
        object-fit: contain;
        filter: drop-shadow(5px 5px 5px rgba(0,0,0,0.3));
        transition: transform 0.3s;
    }

    .pokemon-display.fainted .pokemon-image-lg {
        transform: rotate(90deg);
        filter: grayscale(100%);
        opacity: 0.6;
    }

    .hp-bar-container {
        height: 15px;
        background: #555;
        border-radius: 10px;
        margin: 10px 0;
        overflow: hidden;
        position: relative;
    }

    .hp-bar-fill {
        height: 100%;
        transition: width 0.5s ease-out, background-color 0.3s;
    }
    
    .hp-bar-text {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        font-size: 10px;
        line-height: 15px;
        color: white;
        text-shadow: 1px 1px 1px #000;
        text-align: center;
    }

    .power-badge {
        position: absolute;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
        z-index: 10;
    }

    .power-badge.left {
         left: 20px;
         background-color: #0dcaf0; /* Cyan */
    }

    .power-badge.right {
         right: 20px;
         background-color: #198754; /* Green */
    }
    
    .round-control {
        text-align: center;
        z-index: 5;
    }

    .round-badge {
        background: #000;
        color: #fff;
        padding: 5px 20px;
        border-radius: 20px;
        font-size: 1.2rem;
        margin: 0 10px;
    }
    
    .control-btn {
        background: #000;
        color: white;
        border: 1px solid #444;
        border-radius: 5px;
        padding: 5px 15px;
    }
    .control-btn:disabled {
        opacity: 0.3;
    }
  `],
  template: `
    <div *ngIf="isLoading" class="d-flex justify-content-center my-5">
        <div class="spinner-border text-danger" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>

    <!-- Error State -->
    <div *ngIf="error" class="alert alert-danger text-center">
        {{ error }}
        <div class="mt-2">
            <button class="btn btn-outline-danger btn-sm" (click)="refresh()">Retry</button>
        </div>
    </div>

    <!-- Team Selection (Only shown when not battling) -->
    <div *ngIf="!isLoading && !error && !battleHistory.length">
        <div class="row mb-4">
            <div class="col-6">
                <label class="fw-bold">Team A</label>
                <select [(ngModel)]="teamAId" class="form-select text-capitalize">
                    <option *ngFor="let t of teams" [value]="t.team_id">{{ t.team_name }} (PW: {{ t.total_power }})</option>
                </select>
            </div>
            <div class="col-6">
                <label class="fw-bold">Team B</label>
                <select [(ngModel)]="teamBId" class="form-select text-capitalize">
                    <option *ngFor="let t of teams" [value]="t.team_id">{{ t.team_name }} (PW: {{ t.total_power }})</option>
                </select>
            </div>
        </div>
        <button class="btn btn-danger w-100 mb-3 btn-lg shadow-sm" (click)="fight()" [disabled]="!teamAId || !teamBId || isFighting">
            <span *ngIf="isFighting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            {{ isFighting ? 'Simulating...' : 'START BATTLE' }}
        </button>
        <div *ngIf="battleError" class="alert alert-danger">{{ battleError }}</div>
    </div>

    <!-- Battle Visualization -->
    <div *ngIf="battleHistory.length > 0" class="battle-container fade-in">
        
        <!-- Top Roster (Team A) -->
        <div class="roster-row">
            <div *ngFor="let p of currentFrame.teamA; let i = index" 
                 class="roster-slot" 
                 [class.active]="i === currentFrame.activeAIndex"
                 [class.fainted]="p.status === 'fainted'">
                 <img [src]="p.image || 'assets/placeholder.png'" [title]="p.name">
            </div>
        </div>

        <!-- Main Stage -->
        <div class="battle-stage">
            <!-- Left Fighter (Team A) -->
            <div class="pokemon-display" >
                <div class="hp-bar-container">
                    <div class="hp-bar-fill bg-success" 
                         [style.width.%]="(activeA.currentHp / activeA.maxHp) * 100"
                         [class.bg-danger]="(activeA.currentHp / activeA.maxHp) < 0.2"
                         [class.bg-warning]="(activeA.currentHp / activeA.maxHp) >= 0.2 && (activeA.currentHp / activeA.maxHp) < 0.5">
                    </div>
                    <div class="hp-bar-text">{{ activeA.currentHp }}/{{ activeA.maxHp }}</div>
                </div>

                <div class="position-relative d-inline-block">
                    <img [src]="activeA.image" class="pokemon-image-lg">
                    <div class="power-badge left">
                        <span>{{ activeA.power }} ⚔️</span>
                    </div>
                </div>
                <h4 class="mt-2 text-capitalize fw-bold">{{ activeA.name }}</h4>
            </div>

            <!-- Controls (Center) -->
            <div class="round-control d-flex flex-column align-items-center">
                <div class="mb-2 d-flex align-items-center">
                    <button class="control-btn" (click)="goToRound(currentRoundIndex - 1)" [disabled]="currentRoundIndex === 0">PREVIOUS</button>
                    <span class="round-badge">ROUND {{ currentFrame.round }}</span>
                    <button class="control-btn" (click)="goToRound(currentRoundIndex + 1)" [disabled]="currentRoundIndex === battleHistory.length - 1">NEXT</button>
                </div>
                <div class="text-muted small mt-2">{{ currentFrame.logMessage }}</div>
                
                <div *ngIf="currentRoundIndex === battleHistory.length - 1 && currentFrame.winner" class="mt-3">
                     <div class="alert alert-warning py-1 px-3 fw-bold">
                        🏆 {{ currentFrame.winner }} Wins!
                     </div>
                     <button class="btn btn-sm btn-outline-dark mt-2" (click)="resetBattle()">New Battle</button>
                </div>
            </div>

            <!-- Right Fighter (Team B) -->
            <div class="pokemon-display">
                <div class="hp-bar-container">
                    <div class="hp-bar-fill bg-success"
                         [style.width.%]="(activeB.currentHp / activeB.maxHp) * 100"
                         [class.bg-danger]="(activeB.currentHp / activeB.maxHp) < 0.2"
                         [class.bg-warning]="(activeB.currentHp / activeB.maxHp) >= 0.2 && (activeB.currentHp / activeB.maxHp) < 0.5">
                    </div>
                    <div class="hp-bar-text">{{ activeB.currentHp }}/{{ activeB.maxHp }}</div>
                </div>

                <div class="position-relative d-inline-block">
                    <img [src]="activeB.image" class="pokemon-image-lg">
                    <div class="power-badge right">
                         <span>{{ activeB.power }} ⚔️</span>
                    </div>
                </div>
                <h4 class="mt-2 text-capitalize fw-bold">{{ activeB.name }}</h4>
            </div>
        </div>

        <!-- Bottom Roster (Team B) -->
        <div class="roster-row">
            <div *ngFor="let p of currentFrame.teamB; let i = index" 
                 class="roster-slot"
                 [class.active]="i === currentFrame.activeBIndex"
                 [class.fainted]="p.status === 'fainted'">
                 <img [src]="p.image || 'assets/placeholder.png'" [title]="p.name">
            </div>
        </div>
    </div>
  `
})
export class BattleArenaComponent implements OnInit, OnDestroy {
  teams: Team[] = [];
  teamAId: string = '';
  teamBId: string = '';
  
  isLoading = true;
  isFighting = false;
  error: string | null = null;
  battleError: string | null = null;
  
  // Battle State
  battleHistory: BattleState[] = [];
  currentRoundIndex: number = 0;

  private teamsSub!: Subscription;

  constructor(private api: ApiService) {}

  get currentFrame(): BattleState {
      return this.battleHistory[this.currentRoundIndex];
  }

  get activeA(): BattlePokemon {
      const frame = this.currentFrame;
      return frame.teamA[frame.activeAIndex];
  }

  get activeB(): BattlePokemon {
      const frame = this.currentFrame;
      return frame.teamB[frame.activeBIndex];
  }

  ngOnInit() {
    this.refresh();
    this.teamsSub = this.api.teamsUpdated$.subscribe(() => {
      this.refresh();
    });
  }

  ngOnDestroy() {
    if (this.teamsSub) this.teamsSub.unsubscribe();
  }
  
  refresh() {
    this.isLoading = true;
    this.error = null;
    this.api.getTeams()
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
            next: t => this.teams = t,
            error: err => this.error = 'Failed to load teams.'
        });
  }

  fight() {
    if (!this.teamAId || !this.teamBId) return;
    this.isFighting = true;
    this.battleError = null;
    
    this.api.simulateBattle(this.teamAId, this.teamBId)
        .pipe(finalize(() => this.isFighting = false))
        .subscribe({
            next: (res: any) => this.processBattleResult(res),
            error: err => this.battleError = 'Battle simulation failed.'
        });
  }

  resetBattle() {
      this.battleHistory = [];
      this.currentRoundIndex = 0;
  }

  goToRound(index: number) {
      if (index >= 0 && index < this.battleHistory.length) {
          this.currentRoundIndex = index;
      }
  }

  private processBattleResult(result: any) {
    if (!result.initialState || !result.logs) {
        this.battleError = "Invalid response from server.";
        return;
    }

    const { teamA, teamB } = result.initialState;
    const logs = result.logs;

    // Helper to initialize BattlePokemon
    const initTeam = (t: any[]): BattlePokemon[] => t.map(p => ({
        ...p,
        currentHp: p.life,
        maxHp: p.life,
        status: 'active' // Initial status
    }));

    let currentA = initTeam(teamA);
    let currentB = initTeam(teamB);
    let activeAIdx = 0;
    let activeBIdx = 0;

    // Frame 0: Start
    const history: BattleState[] = [];
    
    // Push Initial State
    history.push({
        round: 0,
        teamA: JSON.parse(JSON.stringify(currentA)),
        teamB: JSON.parse(JSON.stringify(currentB)),
        activeAIndex: activeAIdx,
        activeBIndex: activeBIdx,
        logMessage: "Battle Ready!"
    });

    logs.forEach((log: any) => {
        // Deep copy current state to modify for next frame
        // Note: In a real "Step", we might want to aggregate all events of a round.
        // But here we can make a frame per log to be granular or per round.
        // Let's rely on log 'round' property.
        
        let message = log.message;

        if (log.details) {
            // Update HP
            const p1Val = log.details.p1;
            const p2Val = log.details.p2;

            // Find them in the roster. 
            // We assume active pointers are correct for the "damage" phase.
            // p1 is active team A, p2 is active team B
            
            if (currentA[activeAIdx]) currentA[activeAIdx].currentHp = p1Val.remaining;
            if (currentB[activeBIdx]) currentB[activeBIdx].currentHp = p2Val.remaining;

            history.push({
                round: log.round,
                teamA: JSON.parse(JSON.stringify(currentA)),
                teamB: JSON.parse(JSON.stringify(currentB)),
                activeAIndex: activeAIdx,
                activeBIndex: activeBIdx,
                logMessage: message
            });
        } 
        else if (log.type === 'faint') {
            // Handle Faint
            if (log.team === 'A') {
                if (currentA[activeAIdx]) currentA[activeAIdx].status = 'fainted';
                activeAIdx++; // Next pokemon
            } else {
                if (currentB[activeBIdx]) currentB[activeBIdx].status = 'fainted';
                activeBIdx++;
            }
            
            // Note: We update the state, but maybe we don't show a separate frame just for "fainted"
            // unless we want to see the "X has fainted" message with the fainted pokemon shown.
            // Let's show it.
            history.push({
                round: history[history.length - 1].round, // Same round
                teamA: JSON.parse(JSON.stringify(currentA)),
                teamB: JSON.parse(JSON.stringify(currentB)),
                activeAIndex: activeAIdx < currentA.length ? activeAIdx : activeAIdx - 1, // Keep showing last if all dead
                activeBIndex: activeBIdx < currentB.length ? activeBIdx : activeBIdx - 1,
                logMessage: message
            });
        }
    });

    // Mark winner on last frame
    const lastFrame = history[history.length - 1];
    lastFrame.winner = result.winner;

    this.battleHistory = history;
    this.currentRoundIndex = 0;
  }
}
