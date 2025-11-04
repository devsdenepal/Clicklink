/**
 * Middleware to ensure the authenticated user belongs to the required ClickUp team/workspace.
 * Set REQUIRED_CLICKUP_TEAM_ID in backend .env to enforce.
 */
module.exports = function requireTeam(req, res, next) {
  try {
    const required = process.env.REQUIRED_CLICKUP_TEAM_ID;
    if (!required) return next(); // not configured -> no enforcement

    const user = req.user || {};
    // teams can be present in the JWT as an array of { id, name }
    const teams = Array.isArray(user.teams) ? user.teams : [];

    const ids = teams.map(t => String(t.id));
    // also support single team field
    if (user.team) ids.push(String(user.team));

    if (ids.includes(String(required))) return next();

    return res.status(403).json({
      error: 'Workspace mismatch',
      code: 'TEAM_MISMATCH',
      message: 'Your ClickUp account is not a member of the required workspace. Request access or switch to the configured workspace.'
    });
  } catch (e) {
    next(e);
  }
};
