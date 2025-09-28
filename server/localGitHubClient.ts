// Local GitHub client for AI Assistant Studio
// Replaces Replit GitHub connectors for local hosting

import { Octokit } from '@octokit/rest';

export async function getLocalGitHubClient() {
  const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  
  if (!githubToken) {
    throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN environment variable is required for GitHub integration');
  }
  
  return new Octokit({ 
    auth: githubToken 
  });
}

// For backward compatibility with existing code
export { getLocalGitHubClient as getUncachableGitHubClient };