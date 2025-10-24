import React, { useEffect, useState } from 'react';
import { teamsAPI } from './services/api';
import { Team } from './types';
import Dashboard from './components/Dashboard';
import './App.css';

const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await teamsAPI.getAll();
      setTeams(response.data);

      if (response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <h2>Loading DORA Metrics Dashboard...</h2>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="app-error">
        <h2>No Teams Found</h2>
        <p>Please create a team in the backend to get started.</p>
        <pre>
          {`POST /api/teams
{
  "name": "Your Team Name",
  "description": "Team description",
  "github_repos": ["repo1", "repo2"]
}`}
        </pre>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-brand">DORA Metrics</div>
        <div className="nav-teams">
          {teams.map((team) => (
            <button
              key={team.id}
              className={`team-button ${selectedTeam?.id === team.id ? 'active' : ''}`}
              onClick={() => setSelectedTeam(team)}
            >
              {team.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="app-main">
        {selectedTeam && (
          <Dashboard teamId={selectedTeam.id} teamName={selectedTeam.name} />
        )}
      </main>
    </div>
  );
};

export default App;
