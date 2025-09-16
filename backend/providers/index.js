// Export all providers for easy importing
const GitHubProvider = require('./github');
const DockerHubProvider = require('./dockerhub');
const GenericProvider = require('./generic');

module.exports = {
  GitHubProvider,
  DockerHubProvider,
  GenericProvider
};