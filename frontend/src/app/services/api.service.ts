import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Pokemon, Team, PokemonType } from '../models/pokemon';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';
  private teamsUpdatedSource = new Subject<void>();

  get teamsUpdated$() {
    return this.teamsUpdatedSource.asObservable();
  }

  constructor(private http: HttpClient) {}

  getPokemons(): Observable<Pokemon[]> {
    return this.http.get<Pokemon[]>(`${this.apiUrl}/pokemons`).pipe(
      catchError(err => {
        console.error('API Error in getPokemons:', err);
        return throwError(() => err);
      })
    );
  }

  getPokemonTypes(): Observable<PokemonType[]> {
    return this.http.get<PokemonType[]>(`${this.apiUrl}/types`);
  }

  updatePokemon(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/pokemons/${id}`, data);
  }

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.apiUrl}/teams`);
  }

  createTeam(name: string, pokemonIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/teams`, { name, pokemonIds }).pipe(
      tap(() => this.teamsUpdatedSource.next())
    );
  }

  simulateBattle(teamAId: string, teamBId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/battle/simulate`, { teamAId, teamBId });
  }
}