import { describe, expect, it } from 'vitest';
import { ROOMS } from '@/game/catalog/rooms';
import { getToyPlay } from '@/game/catalog/toys';
import { createFullNeeds, HOME_FIXTURE_IDS, type HomeGuide, type Needs } from '@/game/types';
import {
  applyHomeInteraction,
  guideTarget,
  homeGuideState,
  homeJoyForToy,
  interactionForFixture,
  interactionForItem,
  nextGuideTask,
  wishForNeeds,
} from '@/systems/home';

const EMPTY_GUIDE: HomeGuide = { played: false, decorated: false, town: false };

describe('home fixtures', () => {
  it('places valid, unique fixtures inside every room', () => {
    for (const room of Object.values(ROOMS)) {
      const ids = room.fixtures.map((fixture) => fixture.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const fixture of room.fixtures) {
        expect(HOME_FIXTURE_IDS).toContain(fixture.id);
        expect(fixture.x).toBeGreaterThanOrEqual(room.placementArea.left);
        expect(fixture.x).toBeLessThanOrEqual(room.placementArea.right);
        expect(fixture.y).toBeGreaterThanOrEqual(room.placementArea.top);
        expect(fixture.y).toBeLessThanOrEqual(room.placementArea.bottom);
      }
    }

    expect(ROOMS.living.fixtures.some((fixture) => fixture.id === 'bowl')).toBe(true);
  });

  it('maps every fixture to a care action', () => {
    expect(interactionForFixture('bowl')).toBe('feed');
    expect(interactionForFixture('ball')).toBe('play');
    expect(interactionForFixture('cushion')).toBe('sleep');
  });
});

describe('home interactions', () => {
  it('recognizes toys, beds and seats', () => {
    expect(interactionForItem('ball')).toMatchObject({ kind: 'play', need: 'joy' });
    expect(interactionForItem('pet-bed')).toMatchObject({ kind: 'sleep', need: 'energy' });
    expect(interactionForItem('cushion')).toMatchObject({ kind: 'sleep', need: 'energy' });
    expect(interactionForItem('sofa')).toMatchObject({ kind: 'cuddle', need: 'joy' });
    expect(interactionForItem('rug')).toBeNull();
    expect(interactionForItem('made-up')).toBeNull();
  });

  it('gives less joy at home than in the park', () => {
    const homeJoy = homeJoyForToy('ball');
    expect(homeJoy).toBeLessThan(getToyPlay('ball').joy);
    expect(homeJoy).toBeGreaterThanOrEqual(8);
  });

  it('caps gains at 100 and reports the actual gain', () => {
    const interaction = interactionForItem('ball');
    expect(interaction).not.toBeNull();
    if (!interaction) {
      return;
    }

    const needs: Needs = { ...createFullNeeds(), joy: 95 };
    const result = applyHomeInteraction(needs, interaction);

    expect(result.needs.joy).toBe(100);
    expect(result.gained).toBe(5);
    expect(result.need).toBe('joy');
    expect(needs.joy).toBe(95);
  });

  it('does not gain anything when the need is already full', () => {
    const interaction = interactionForItem('pet-bed');
    expect(interaction).not.toBeNull();
    if (!interaction) {
      return;
    }

    const result = applyHomeInteraction(createFullNeeds(), interaction);
    expect(result.gained).toBe(0);
    expect(result.needs).toEqual(createFullNeeds());
  });
});

describe('pet wishes', () => {
  it('wishes for nothing when every need is fine', () => {
    expect(wishForNeeds(createFullNeeds())).toBeNull();
  });

  it('maps the lowest low need to the right care action', () => {
    expect(wishForNeeds({ hunger: 20, joy: 80, energy: 90 })).toEqual({
      need: 'hunger',
      action: 'feed',
    });
    expect(wishForNeeds({ hunger: 80, joy: 20, energy: 90 })).toEqual({
      need: 'joy',
      action: 'play',
    });
    expect(wishForNeeds({ hunger: 80, joy: 80, energy: 20 })).toEqual({
      need: 'energy',
      action: 'sleep',
    });
  });

  it('picks the lowest need when several are low', () => {
    expect(wishForNeeds({ hunger: 30, joy: 10, energy: 20 })).toEqual({
      need: 'joy',
      action: 'play',
    });
  });
});

describe('home guide', () => {
  it('walks through feed, play, town and decorate in order', () => {
    const state = homeGuideState(false, EMPTY_GUIDE);
    expect(nextGuideTask(state)).toBe('feed');

    state.fed = true;
    expect(nextGuideTask(state)).toBe('play');

    state.played = true;
    expect(nextGuideTask(state)).toBe('town');

    state.town = true;
    expect(nextGuideTask(state)).toBe('decorate');

    state.decorated = true;
    expect(nextGuideTask(state)).toBeNull();
  });

  it('points at the matching HUD button', () => {
    expect(guideTarget('feed')).toBe('feed');
    expect(guideTarget('play')).toBe('play');
    expect(guideTarget('decorate')).toBe('decor');
    expect(guideTarget('town')).toBe('town');
  });
});
