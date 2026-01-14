/**
 * Unit tests for createStory store action.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { useTUIStore, setProjectDir } from '../../src/store/index';
import type { WorkflowState } from '../../src/types';

describe('createStory', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp project directory
    tempDir = await mkdtemp(join(tmpdir(), 'tui-create-story-'));
    await mkdir(join(tempDir, 'docs/stories'), { recursive: true });
    setProjectDir(tempDir);

    // Reset store state
    useTUIStore.setState({
      stories: [],
      currentStory: null,
      tasks: [],
      view: 'picker',
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('creates story directory and workflow-state.json', async () => {
    const store = useTUIStore.getState();

    await store.createStory('My Test Story');

    // Verify directory was created
    const storyDir = join(tempDir, 'docs/stories/my-test-story');
    expect(existsSync(storyDir)).toBe(true);

    // Verify workflow-state.json exists
    const workflowStatePath = join(storyDir, 'workflow-state.json');
    expect(existsSync(workflowStatePath)).toBe(true);
  });

  it('creates workflow-state.json with correct initial state', async () => {
    const store = useTUIStore.getState();

    await store.createStory('My Test Story');

    const workflowStatePath = join(tempDir, 'docs/stories/my-test-story/workflow-state.json');
    const content = await readFile(workflowStatePath, 'utf-8');
    const state: WorkflowState = JSON.parse(content);

    expect(state.story).toBe('My Test Story');
    expect(state.slug).toBe('my-test-story');
    expect(state.source).toBe('direct');
    expect(state.currentPhase).toBe('understand');
    expect(state.completedPhases).toEqual([]);
    expect(state.startedAt).toBeDefined();
  });

  it('returns the created slug', async () => {
    const store = useTUIStore.getState();

    const slug = await store.createStory('My Test Story');

    expect(slug).toBe('my-test-story');
  });

  it('handles special characters in title', async () => {
    const store = useTUIStore.getState();

    const slug = await store.createStory('Add User Auth!');

    expect(slug).toBe('add-user-auth');

    const storyDir = join(tempDir, 'docs/stories/add-user-auth');
    expect(existsSync(storyDir)).toBe(true);
  });

  it('ensures unique slug for duplicate titles', async () => {
    const store = useTUIStore.getState();

    // Create first story
    await store.createStory('My Story');

    // Create second story with same title
    const slug2 = await store.createStory('My Story');

    expect(slug2).toBe('my-story-2');

    const storyDir2 = join(tempDir, 'docs/stories/my-story-2');
    expect(existsSync(storyDir2)).toBe(true);
  });

  it('refreshes stories after creation', async () => {
    const store = useTUIStore.getState();

    await store.createStory('Test Story');

    // Get updated state
    const { stories } = useTUIStore.getState();

    expect(stories.length).toBe(1);
    expect(stories[0].slug).toBe('test-story');
    expect(stories[0].title).toBe('Test Story');
  });

  it('loads the new story after creation', async () => {
    const store = useTUIStore.getState();

    await store.createStory('Test Story');

    // Get updated state
    const { currentStory } = useTUIStore.getState();

    expect(currentStory).not.toBeNull();
    expect(currentStory?.slug).toBe('test-story');
    expect(currentStory?.story).toBe('Test Story');
  });

  it('transitions to dashboard view after creation', async () => {
    const store = useTUIStore.getState();

    await store.createStory('Test Story');

    // Get updated state
    const { view } = useTUIStore.getState();

    expect(view).toBe('dashboard');
  });

  it('sets currentPhase to understand for new story', async () => {
    const store = useTUIStore.getState();

    await store.createStory('Test Story');

    const { currentStory } = useTUIStore.getState();

    expect(currentStory?.currentPhase).toBe('understand');
  });
});
