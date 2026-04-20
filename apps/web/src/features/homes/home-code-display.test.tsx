import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeCodeDisplay } from './home-code-display';

describe('HomeCodeDisplay', () => {
  it('renders the join code label and value', () => {
    const html = renderToStaticMarkup(<HomeCodeDisplay code="MCH-7K4P9Q" onCopy={() => {}} />);

    expect(html).toContain('Home code');
    expect(html).toContain('MCH-7K4P9Q');
    expect(html).toContain('Copy code');
  });
});
