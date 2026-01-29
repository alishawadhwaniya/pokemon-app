# Pokemon Battle Application

A full-stack web application that allows users to manage Pokemon teams, view Pokemon stats, and simulate battles. Built with Angular, Node.js/Express, and Supabase (PostgreSQL).

## Project Structure

- **frontend/**: Angular application for the user interface.
- **backend/**: Node.js/Express server handling API requests.
- **database/**: SQL schema for setting up the Supabase database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Angular CLI](https://angular.io/cli): Install globally via `npm install -g @angular/cli`
- A [Supabase](https://supabase.com/) account for the database.

---

## 1. Database Setup (Supabase)

1.  Create a new project in your Supabase dashboard.
2.  Go to the **SQL Editor** in the Supabase dashboard.
3.  Copy the contents of `database/schema.sql` from this project.
4.  Paste the SQL into the editor and click **Run** to create the necessary tables and seed initial data.
5.  Go to **Project Settings -> API** and copy:
    *   Project URL
    *   `anon` public key

## 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    *   Create a `.env` file in the `backend/` directory.
    *   Add your Supabase credentials found in step 1:
        ```env
        SUPABASE_URL=your_supabase_project_url
        SUPABASE_KEY=your_supabase_anon_key
        PORT=3000
        ```

4.  Start the server:
    ```bash
    node server.js
    ```
    *   The backend will run on `http://localhost:3000`.

## 3. Frontend Setup

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the application:
    ```bash
    ng serve
    ```

4.  Open your browser and navigate to `http://localhost:4200`.

## Features

- **Pokemon List**: View all available Pokemon with their stats (Life, Power).
- **Edit Stats**: Update a Pokemon's life or power stats.
- **Team Builder**: Create and manage teams of Pokemon.
- **Battle Arena**: Select two teams and simulate a battle based on type weaknesses and power stats.

## API Endpoints

The backend provides the following main REST API endpoints (running on port 3000):

- `GET /api/pokemons`: Retrieve all Pokemon.
- `PUT /api/pokemons/:id`: Update a Pokemon's stats.
- `GET /api/teams`: Retrieve all teams.
- `POST /api/teams`: Create a new team.
- `POST /api/battle`: Simulate a battle between two teams.

## Technologies Used

- **Frontend**: Angular 17+, Bootstrap
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Supabase)
