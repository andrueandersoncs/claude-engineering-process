/**
 * File Utilities
 *
 * Safe file operations for reading story files and configuration.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Safely read a file, returning null if it doesn't exist or can't be read.
 *
 * @param filePath - Absolute path to the file
 * @returns File contents as string, or null if unavailable
 */
export function readFileSafe(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Safely parse a JSON file, returning null if invalid or unavailable.
 *
 * @param filePath - Absolute path to the JSON file
 * @returns Parsed JSON object, or null if unavailable/invalid
 */
export function readJsonSafe<T>(filePath: string): T | null {
  const content = readFileSafe(filePath);
  if (content === null) {
    return null;
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a path exists and is a directory.
 *
 * @param dirPath - Path to check
 * @returns True if path is an existing directory
 */
export function isDirectory(dirPath: string): boolean {
  try {
    return existsSync(dirPath) && statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path exists and is a file.
 *
 * @param filePath - Path to check
 * @returns True if path is an existing file
 */
export function isFile(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Get the modification time of a file.
 *
 * @param filePath - Path to the file
 * @returns Date of last modification, or null if unavailable
 */
export function getModifiedTime(filePath: string): Date | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return statSync(filePath).mtime;
  } catch {
    return null;
  }
}

/**
 * List subdirectories in a directory.
 *
 * @param dirPath - Path to the directory
 * @returns Array of subdirectory names (not full paths)
 */
export function listSubdirectories(dirPath: string): string[] {
  try {
    if (!isDirectory(dirPath)) {
      return [];
    }
    return readdirSync(dirPath).filter((name) => {
      const fullPath = join(dirPath, name);
      return isDirectory(fullPath) && !name.startsWith('.');
    });
  } catch {
    return [];
  }
}

/**
 * Get the story directory path for a given project and story slug.
 *
 * @param projectDir - Project root directory
 * @param storySlug - Story identifier slug
 * @returns Absolute path to the story directory
 */
export function getStoryDir(projectDir: string, storySlug: string): string {
  return join(projectDir, 'docs', 'stories', storySlug);
}

/**
 * Get the path to a story file.
 *
 * @param storyDir - Story directory path
 * @param filename - File name (e.g., 'workflow-state.json', 'tasks.md')
 * @returns Absolute path to the file
 */
export function getStoryFilePath(storyDir: string, filename: string): string {
  return join(storyDir, filename);
}
