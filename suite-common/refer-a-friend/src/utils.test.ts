import { createFormatAmount, getDaysUntil } from './utils';

describe(getDaysUntil.name, () => {
    const NOW = new Date('2026-01-15T12:00:00Z').getTime();

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns the number of full days until a future date', () => {
        // 2026-01-16T12:00:00Z is exactly 1 day after NOW.
        expect(getDaysUntil('2026-01-16T12:00:00Z')).toBe(1);
    });

    it('returns 0 for today', () => {
        expect(getDaysUntil('2026-01-15T12:00:00Z')).toBe(0);
    });

    it('returns 0 for a past date', () => {
        expect(getDaysUntil('2026-01-14T12:00:00Z')).toBe(0);
    });

    it('ceil rounds partial days up', () => {
        // 2026-01-16T00:30:00Z is less than a full day but more than 0 days away.
        expect(getDaysUntil('2026-01-16T00:30:00Z')).toBe(1);
    });
});

describe(createFormatAmount.name, () => {
    it('formats an amount as a currency string without fractional digits', () => {
        const formatAmount = createFormatAmount('USD');

        expect(formatAmount(20)).toBe('$20');
        expect(formatAmount(1000)).toBe('$1,000');
        expect(formatAmount(0.49)).toBe('$0');
    });

    it('formats an amount in a different currency', () => {
        const formatAmount = createFormatAmount('EUR');

        expect(formatAmount(49)).toBe('€49');
    });
});
