/**
 * Settings Legal Links Wiring Tests
 *
 * Verifies that the settings screen imports and uses the
 * openTermsOfService / openPrivacyPolicy handlers from legalLinkHandlers.
 * Full rendering is not possible in node test environment, so we verify
 * the import wiring by reading the source and confirming the binding.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Settings screen legal link wiring', () => {
  const settingsSource = fs.readFileSync(
    path.resolve(__dirname, '../../app/(tabs)/settings.tsx'),
    'utf-8',
  );

  it('imports openTermsOfService from legalLinkHandlers', () => {
    expect(settingsSource).toMatch(
      /import\s+\{[^}]*openTermsOfService[^}]*\}\s+from\s+['"]@\/utils\/legalLinkHandlers['"]/,
    );
  });

  it('imports openPrivacyPolicy from legalLinkHandlers', () => {
    expect(settingsSource).toMatch(
      /import\s+\{[^}]*openPrivacyPolicy[^}]*\}\s+from\s+['"]@\/utils\/legalLinkHandlers['"]/,
    );
  });

  it('binds openTermsOfService to a Pressable onPress', () => {
    expect(settingsSource).toMatch(/onPress=\{openTermsOfService\}/);
  });

  it('binds openPrivacyPolicy to a Pressable onPress', () => {
    expect(settingsSource).toMatch(/onPress=\{openPrivacyPolicy\}/);
  });

  it('displays 利用規約 label', () => {
    expect(settingsSource).toContain('利用規約');
  });

  it('displays プライバシーポリシー label', () => {
    expect(settingsSource).toContain('プライバシーポリシー');
  });

  it('legal links have accessibilityRole="link"', () => {
    // Both openTermsOfService and openPrivacyPolicy Pressables should have accessibilityRole
    const termsMatch = settingsSource.match(/onPress=\{openTermsOfService\}[\s\S]{0,30}accessibilityRole="link"/);
    const privacyMatch = settingsSource.match(/onPress=\{openPrivacyPolicy\}[\s\S]{0,30}accessibilityRole="link"/);
    expect(termsMatch).not.toBeNull();
    expect(privacyMatch).not.toBeNull();
  });
});
