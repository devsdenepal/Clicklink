const { getClickUpTeams } = require('../utils/clickup');

const getMembers = async (req, res) => {
  try {
    const teams = await getClickUpTeams(req.user.clickupToken);
    const members = teams.flatMap(team => team.members.map(m => m.user));
    res.json(members);
  } catch (err) {
    console.error('Failed to fetch members:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

module.exports = {
  getMembers
};
