import { parseVersion, createTagName } from '../version';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

describe('parseVersion', () => {
  describe('tags with v prefix', () => {
    it('should parse v1.2.3 correctly', () => {
      const result = parseVersion('v1.2.3', false);
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.isPrerelease).toBe(false);
      expect(result.original).toBe('v1.2.3');
    });

    it('should parse v2.0.0 correctly', () => {
      const result = parseVersion('v2.0.0', false);
      expect(result.major).toBe(2);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
      expect(result.isPrerelease).toBe(false);
    });

    it('should parse v10.20.30 correctly', () => {
      const result = parseVersion('v10.20.30', false);
      expect(result.major).toBe(10);
      expect(result.minor).toBe(20);
      expect(result.patch).toBe(30);
    });
  });

  describe('tags without v prefix', () => {
    it('should parse 1.2.3 correctly', () => {
      const result = parseVersion('1.2.3', false);
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.isPrerelease).toBe(false);
      expect(result.original).toBe('1.2.3');
    });

    it('should parse 2.0.0 correctly', () => {
      const result = parseVersion('2.0.0', false);
      expect(result.major).toBe(2);
      expect(result.minor).toBe(0);
      expect(result.patch).toBe(0);
    });
  });

  describe('tags with refs/tags/ prefix', () => {
    it('should parse refs/tags/v1.2.3 correctly', () => {
      const result = parseVersion('refs/tags/v1.2.3', false);
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.original).toBe('refs/tags/v1.2.3');
    });

    it('should parse refs/tags/1.2.3 correctly', () => {
      const result = parseVersion('refs/tags/1.2.3', false);
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
    });
  });

  describe('prerelease versions', () => {
    it('should detect prerelease with v prefix', () => {
      const result = parseVersion('v1.2.3-beta.1', false);
      expect(result.isPrerelease).toBe(true);
      expect(result.prerelease).toBe('beta.1');
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
    });

    it('should detect prerelease without v prefix', () => {
      const result = parseVersion('1.2.3-alpha', false);
      expect(result.isPrerelease).toBe(true);
      expect(result.prerelease).toBe('alpha');
    });

    it('should detect prerelease with multiple segments', () => {
      const result = parseVersion('v2.0.0-rc.1.2', false);
      expect(result.isPrerelease).toBe(true);
      expect(result.prerelease).toBe('rc.1.2');
    });
  });

  describe('build metadata', () => {
    it('should parse version with build metadata', () => {
      const result = parseVersion('v1.2.3+build.123', false);
      expect(result.major).toBe(1);
      expect(result.minor).toBe(2);
      expect(result.patch).toBe(3);
      expect(result.build).toBe('build.123');
      expect(result.isPrerelease).toBe(false);
    });

    it('should parse prerelease with build metadata', () => {
      const result = parseVersion('v1.2.3-beta.1+build.456', false);
      expect(result.isPrerelease).toBe(true);
      expect(result.prerelease).toBe('beta.1');
      expect(result.build).toBe('build.456');
    });
  });

  describe('invalid versions', () => {
    it('should throw error for invalid format', () => {
      expect(() => parseVersion('invalid', false)).toThrow(
        'Invalid semantic version format'
      );
    });

    it('should throw error for missing patch version', () => {
      expect(() => parseVersion('v1.2', false)).toThrow(
        'Invalid semantic version format'
      );
    });

    it('should throw error for non-numeric versions', () => {
      expect(() => parseVersion('v1.2.x', false)).toThrow(
        'Invalid semantic version format'
      );
    });
  });
});

describe('createTagName', () => {
  it('should create major tag with default prefix', () => {
    const result = createTagName('v', 2);
    expect(result).toBe('v2');
  });

  it('should create major tag with custom prefix', () => {
    const result = createTagName('release-', 3);
    expect(result).toBe('release-3');
  });

  it('should create minor tag with default prefix', () => {
    const result = createTagName('v', 2, 3);
    expect(result).toBe('v2.3');
  });

  it('should create minor tag with custom prefix', () => {
    const result = createTagName('release-', 1, 2);
    expect(result).toBe('release-1.2');
  });

  it('should handle zero versions', () => {
    const major = createTagName('v', 0);
    const minor = createTagName('v', 0, 0);
    expect(major).toBe('v0');
    expect(minor).toBe('v0.0');
  });

  it('should handle large version numbers', () => {
    const result = createTagName('v', 10, 20);
    expect(result).toBe('v10.20');
  });
});

