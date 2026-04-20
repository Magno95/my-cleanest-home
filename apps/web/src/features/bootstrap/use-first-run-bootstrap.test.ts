import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, homesInsert, homesSelectOrder, profileUpdateEq, ensureMiscellaneousRoom } = vi.hoisted(
  () => ({
    rpc: vi.fn(),
    homesInsert: vi.fn(),
    homesSelectOrder: vi.fn(),
    profileUpdateEq: vi.fn(),
    ensureMiscellaneousRoom: vi.fn(),
  }),
);

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc,
    from: vi.fn((table: string) => {
      if (table === 'homes') {
        return {
          select: vi.fn(() => ({
            order: homesSelectOrder,
          })),
          insert: homesInsert,
        };
      }

      if (table === 'user_profiles') {
        return {
          update: vi.fn(() => ({
            eq: profileUpdateEq,
          })),
        };
      }

      throw new Error(`Unexpected table mock: ${table}`);
    }),
  },
}));

vi.mock('../rooms/miscellaneous-room.js', () => ({
  ensureMiscellaneousRoom,
}));

import { ensureDemoData } from './use-first-run-bootstrap';

describe('ensureDemoData', () => {
  beforeEach(() => {
    rpc.mockReset();
    homesInsert.mockReset();
    homesSelectOrder.mockReset();
    profileUpdateEq.mockReset();
    ensureMiscellaneousRoom.mockReset();
  });

  it('creates the default home through create_home RPC during first-run bootstrap', async () => {
    const stopAfterHomeSetup = new Error('stop after home setup');

    homesSelectOrder.mockResolvedValue({ data: [], error: null });
    homesInsert.mockImplementation(() => {
      throw new Error('direct homes insert should not be used');
    });
    rpc.mockResolvedValue({ data: 'home-123', error: null });
    profileUpdateEq.mockResolvedValue({ error: null });
    ensureMiscellaneousRoom.mockRejectedValue(stopAfterHomeSetup);

    await expect(ensureDemoData('user-123', null)).rejects.toThrow(stopAfterHomeSetup);

    expect(rpc).toHaveBeenCalledWith('create_home', { name: 'MyHome' });
    expect(homesInsert).not.toHaveBeenCalled();
  });
});
