const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// GET /api/teams - List all teams ordered by total power
router.get('/', async (req, res) => {
    // Calls the PostgreSQL function 'get_teams_ordered_by_power'
    const { data, error } = await supabase.rpc('get_teams_ordered_by_power');
    
    if (error) {
        console.error('Error fetching teams:', error);
        return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
});

// POST /api/teams - Create a new team of 6 Pokemons
router.post('/', async (req, res) => {
    const { name, pokemonIds } = req.body;

    // Validation: Ensure we have exactly 6 IDs
    if (!pokemonIds || pokemonIds.length !== 6) {
        return res.status(400).json({ error: 'A team must consist of exactly 6 Pokemons.' });
    }
    if (!name) {
        return res.status(400).json({ error: 'Team name is required.' });
    }

    // Calls the PostgreSQL function 'create_team'
    const { data, error } = await supabase.rpc('create_team', {
        team_name: name,
        pokemon_ids: pokemonIds
    });

    if (error) {
        console.error('Error creating team:', error);
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ message: 'Team created successfully', teamId: data });
});

module.exports = router;