import { describe, expect, it, vi } from 'vitest';
import { joinHomeByCode } from './use-join-home-by-code';

vi.mock('../../lib/supabase.js', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '../../lib/supabase.js';

describe('joinHomeByCode', () => {
  it('calls the join_home_by_code RPC with the entered code', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'home-123', error: null });

    await expect(joinHomeByCode({ code: 'MCH-7K4P9Q' })).resolves.toBe('home-123');

    expect(supabase.rpc).toHaveBeenCalledWith('join_home_by_code', {
      code: 'MCH-7K4P9Q',
    });
  });

  it('normalizes the code by trimming whitespace and uppercasing before calling the RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'home-123', error: null });

    await expect(joinHomeByCode({ code: '  mch-7k4p9q  ' })).resolves.toBe('home-123');

    expect(supabase.rpc).toHaveBeenCalledWith('join_home_by_code', {
      code: 'MCH-7K4P9Q',
    });
  });
});
