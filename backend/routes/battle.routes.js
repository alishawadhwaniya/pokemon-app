const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

router.post('/simulate', async (req, res) => {
    const { teamAId, teamBId } = req.body;

    // 1. Fetch full details for both teams
    const { data: teamAData } = await fetchTeamDetails(teamAId);
    const { data: teamBData } = await fetchTeamDetails(teamBId);
    
    // 2. Fetch Weakness Chart
    const { data: weaknesses } = await supabase.from('weakness').select('*');

    if (!teamAData || !teamBData) return res.status(404).send('Teams not found');

    const logs = [];
    let roundCount = 1;

    // Deep copy to not mutate original data during simulation
    let queueA = JSON.parse(JSON.stringify(teamAData));
    let queueB = JSON.parse(JSON.stringify(teamBData));

    // Helper to find factor
    const getFactor = (attackerType, defenderType) => {
        const w = weaknesses.find(w => w.type1_id === attackerType && w.type2_id === defenderType);
        return w ? w.factor : 1; // Default 1 if no rule
    };

    // Battle Loop
    while (queueA.length > 0 && queueB.length > 0) {
        const p1 = queueA[0];
        const p2 = queueB[0];

        logs.push({
            round: roundCount,
            message: `Round ${roundCount} starts: ${p1.name} (Team A) vs ${p2.name} (Team B)`
        });

        // Calculate Damage
        // P2 attacks P1
        const factor2to1 = getFactor(p2.type_id, p1.type_id);
        const dmgTo1 = p2.power * factor2to1;
        
        // P1 attacks P2
        const factor1to2 = getFactor(p1.type_id, p2.type_id);
        const dmgTo2 = p1.power * factor1to2;

        // Apply Damage
        p1.life = p1.life - dmgTo1;
        p2.life = p2.life - dmgTo2;

        logs.push({
            round: roundCount,
            details: {
                p1: { id: p1.id, name: p1.name, taken: dmgTo1, remaining: p1.life },
                p2: { id: p2.id, name: p2.name, taken: dmgTo2, remaining: p2.life }
            }
        });

        // Elimination Logic
        if (p1.life <= 0) {
            logs.push({ message: `${p1.name} fainted!`, type: 'faint', team: 'A', pokemonId: p1.id });
            queueA.shift(); // Remove from queue
        }
        if (p2.life <= 0) {
            logs.push({ message: `${p2.name} fainted!`, type: 'faint', team: 'B', pokemonId: p2.id });
            queueB.shift();
        }

        roundCount++;
    }

    const winner = queueA.length > 0 ? 'Team A' : (queueB.length > 0 ? 'Team B' : 'Draw');
    
    res.json({
        winner,
        logs,
        initialState: {
            teamA: teamAData,
            teamB: teamBData
        },
        teamASurvivors: queueA,
        teamBSurvivors: queueB
    });
});

async function fetchTeamDetails(teamId) {
    // Join team_pokemon -> pokemon -> pokemon_type
    const { data, error } = await supabase
        .from('team_pokemon')
        .select(`
            pokemon (
                id, name, power, life, image,
                type_id
            )
        `)
        .eq('team_id', teamId)
        .order('slot_order');
    
    // Flatten structure
    const pokemons = (data || []).map(item => item.pokemon);
    return { data: pokemons, error };
}

module.exports = router;