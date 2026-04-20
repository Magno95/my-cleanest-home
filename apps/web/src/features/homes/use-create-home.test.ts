import { vi, describe, it, expect } from 'vitest';
import { createHome } from './use-create-home.ts';

vi.mock('../../lib/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));
vi.mock('../rooms/miscellaneous-room.js', () => ({
  ensureMiscellaneousRoom: vi.fn(),
}));

import { supabase } from '../../lib/supabase.js';
import { ensureMiscellaneousRoom } from '../rooms/miscellaneous-room.js';

describe('createHome', () => {
  it('calls supabase.rpc and ensureMiscellaneousRoom', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'home-123', error: null });
    vi.mocked(ensureMiscellaneousRoom).mockResolvedValue(undefined);

    await createHome({ name: 'Apartment' });

    expect(supabase.rpc).toHaveBeenCalledWith('create_home', { name: 'Apartment' });
    expect(ensureMiscellaneousRoom).toHaveBeenCalledWith('home-123');
  });
});
