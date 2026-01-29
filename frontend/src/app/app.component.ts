import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonListComponent } from './components/pokemon-list/pokemon-list.component';
import { TeamBuilderComponent } from './components/team-builder/team-builder.component';
import { BattleArenaComponent } from './components/battle-arena/battle-arena.component';

@Component({
  selector: 'app-root',
  standalone: true,
  // IMPORT THE SUB-COMPONENTS HERE
  imports: [
    CommonModule, 
    PokemonListComponent, 
    TeamBuilderComponent, 
    BattleArenaComponent
  ],
  templateUrl: './app.component.html',
//   styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'pokemon-battle-app';
}