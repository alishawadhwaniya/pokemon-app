const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const supabase = require('./supabase');

// Import Routes
const battleRoutes = require('./routes/battle.routes');
const teamRoutes = require('./routes/team.routes');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- Route Registration ---
app.use('/api/battle', battleRoutes);
app.use('/api/teams', teamRoutes);

// --- Pokemon Routes (Kept simple here, or can be moved to routes/pokemon.routes.js) ---

// Get All Pokemons
app.get('/api/pokemons', async (req, res) => {
    const { data, error } = await supabase
        .from('pokemon')
        .select('*, pokemon_type(name)')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Get All Pokemon Types
app.get('/api/types', async (req, res) => {
    const { data, error } = await supabase
        .from('pokemon_type')
        .select('*')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Update Pokemon (Adjust info)
app.put('/api/pokemons/:id', async (req, res) => {
    const { id } = req.params;
    const { life, power, type_id } = req.body;
    
    // Basic validation
    if (power < 10 || power > 100) return res.status(400).json({error: "Power must be between 10 and 100"});
    if (life < 50 || life > 100) return res.status(400).json({error: "Life must be between 50 and 100"});

    const updates = { life, power };
    if (type_id) updates.type_id = type_id;

    const { data, error } = await supabase
        .from('pokemon')
        .update(updates)
        .eq('id', id)
        .select();
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));