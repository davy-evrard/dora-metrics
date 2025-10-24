import { Router } from 'express';
import pool from '../database/connection';
import githubService from '../services/github.service';

const router = Router();

// Get all teams
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM teams WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { name, description, github_repos } = req.body;

    const result = await pool.query(
      `INSERT INTO teams (name, description, github_repos)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description, github_repos || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, github_repos } = req.body;

    const result = await pool.query(
      `UPDATE teams
       SET name = $1, description = $2, github_repos = $3
       WHERE id = $4
       RETURNING *`,
      [name, description, github_repos, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Auto-populate a team's repos from GitHub org
router.post('/:id/repos/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const owner = (req.body && req.body.owner) || process.env.GITHUB_ORG;

    // Ensure team exists
    const team = await pool.query('SELECT id FROM teams WHERE id = $1', [id]);
    if (team.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const repos = await githubService.syncTeamRepos(Number(id), owner);
    res.json({ team_id: Number(id), count: repos.length, repos });
  } catch (error) {
    console.error('Error syncing team repos:', error);
    res.status(500).json({ error: 'Failed to sync team repos' });
  }
});

export default router;
