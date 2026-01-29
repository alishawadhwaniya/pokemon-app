-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tables Setup (Requirement 1 & 4) --

CREATE TABLE pokemon_type (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE pokemon (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type_id UUID REFERENCES pokemon_type(id),
    image TEXT,
    power INTEGER CHECK (power BETWEEN 10 AND 100),
    life INTEGER CHECK (life BETWEEN 50 AND 100)
);

-- Weakness Table: type1 attacks type2
CREATE TABLE weakness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type1_id UUID REFERENCES pokemon_type(id), -- Attacker
    type2_id UUID REFERENCES pokemon_type(id), -- Defender
    factor FLOAT NOT NULL
);

CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Junction table for Teams (Requirement 4)
CREATE TABLE team_pokemon (
    team_id UUID REFERENCES team(id) ON DELETE CASCADE,
    pokemon_id UUID REFERENCES pokemon(id),
    slot_order INTEGER CHECK (slot_order BETWEEN 1 AND 6),
    PRIMARY KEY (team_id, slot_order)
);

-- 2. Data Insertion (Requirement 2 & 3) --

-- Insert Types
INSERT INTO pokemon_type (name) VALUES ('fire'), ('water'), ('grass'), ('normal'), ('fighting');

-- Variables for IDs (Do this via a block or assume known for script simplicity. 
-- In a real console, you fetch IDs first. Here is a CTE approach for atomic insert)

DO $$
DECLARE
    f_id UUID; w_id UUID; g_id UUID;
BEGIN
    SELECT id INTO f_id FROM pokemon_type WHERE name = 'fire';
    SELECT id INTO w_id FROM pokemon_type WHERE name = 'water';
    SELECT id INTO g_id FROM pokemon_type WHERE name = 'grass';

    -- Insert Weakness Chart (Req 2)
    -- Fire (Attacker) vs Others
    INSERT INTO weakness (type1_id, type2_id, factor) VALUES 
    (f_id, f_id, 1), (f_id, w_id, 0.5), (f_id, g_id, 2);
    
    -- Water (Attacker) vs Others
    INSERT INTO weakness (type1_id, type2_id, factor) VALUES 
    (w_id, f_id, 2), (w_id, w_id, 1), (w_id, g_id, 0.5);

    -- Grass (Attacker) vs Others
    INSERT INTO weakness (type1_id, type2_id, factor) VALUES 
    (g_id, f_id, 0.5), (g_id, w_id, 2), (g_id, g_id, 1);

    -- Insert Pokemons (Req 3 - 5 per type)
    -- Fire
    INSERT INTO pokemon (name, type_id, image, power, life) VALUES
    ('Charmander', f_id, 'https://img.pokemondb.net/sprites/home/normal/charmander.png', 50, 80),
    ('Charmeleon', f_id, 'https://img.pokemondb.net/sprites/home/normal/charmeleon.png', 70, 90),
    ('Charizard', f_id, 'https://img.pokemondb.net/sprites/home/normal/charizard.png', 95, 100),
    ('Vulpix', f_id, 'https://img.pokemondb.net/sprites/home/normal/vulpix.png', 40, 60),
    ('Arcanine', f_id, 'https://img.pokemondb.net/sprites/home/normal/arcanine.png', 90, 95);

    -- Water
    INSERT INTO pokemon (name, type_id, image, power, life) VALUES
    ('Squirtle', w_id, 'https://img.pokemondb.net/sprites/home/normal/squirtle.png', 45, 85),
    ('Wartortle', w_id, 'https://img.pokemondb.net/sprites/home/normal/wartortle.png', 65, 90),
    ('Blastoise', w_id, 'https://img.pokemondb.net/sprites/home/normal/blastoise.png', 85, 100),
    ('Psyduck', w_id, 'https://img.pokemondb.net/sprites/home/normal/psyduck.png', 50, 70),
    ('Gyarados', w_id, 'https://img.pokemondb.net/sprites/home/normal/gyarados.png', 95, 95);

    -- Grass
    INSERT INTO pokemon (name, type_id, image, power, life) VALUES
    ('Bulbasaur', g_id, 'https://img.pokemondb.net/sprites/home/normal/bulbasaur.png', 45, 85),
    ('Ivysaur', g_id, 'https://img.pokemondb.net/sprites/home/normal/ivysaur.png', 60, 90),
    ('Venusaur', g_id, 'https://img.pokemondb.net/sprites/home/normal/venusaur.png', 85, 100),
    ('Oddish', g_id, 'https://img.pokemondb.net/sprites/home/normal/oddish.png', 40, 60),
    ('Gloom', g_id, 'https://img.pokemondb.net/sprites/home/normal/gloom.png', 55, 75);
END $$;

-- 3. PostgreSQL Functions (Requirement 5) --

-- Function to insert a team of 6
CREATE OR REPLACE FUNCTION create_team(
    team_name TEXT,
    pokemon_ids UUID[] -- Array of 6 Pokemon IDs
) RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
    i INTEGER;
BEGIN
    IF array_length(pokemon_ids, 1) != 6 THEN
        RAISE EXCEPTION 'Team must contain exactly 6 Pokemons';
    END IF;

    INSERT INTO team (name) VALUES (team_name) RETURNING id INTO new_team_id;

    FOR i IN 1..6 LOOP
        INSERT INTO team_pokemon (team_id, pokemon_id, slot_order)
        VALUES (new_team_id, pokemon_ids[i], i);
    END LOOP;

    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get teams ordered by power
-- (Summer of each pokemon's power in the team)
CREATE OR REPLACE FUNCTION get_teams_ordered_by_power()
RETURNS TABLE (
    team_id UUID,
    team_name TEXT,
    total_power BIGINT,
    pokemons JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        SUM(p.power) as total_power,
        json_agg(json_build_object('name', p.name, 'power', p.power, 'image', p.image))
    FROM team t
    JOIN team_pokemon tp ON t.id = tp.team_id
    JOIN pokemon p ON tp.pokemon_id = p.id
    GROUP BY t.id, t.name
    ORDER BY total_power DESC;
END;
$$ LANGUAGE plpgsql;