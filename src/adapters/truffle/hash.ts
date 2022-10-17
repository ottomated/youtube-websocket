export function getStringHash(string: string): number {
	let hash = 0;
	if (string.length === 0) return 0;
	for (let i = 0; i < string.length; i++) {
		const chr = string.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

export function hashColor(string: string): string {
	const hash = getStringHash(string);
	return `hsl(${(((hash % 60) + 60) % 60) * 6}deg, 100%, 70%)`;
}

const colors = [
	'#ff0000',
	'#009000',
	'#b22222',
	'#ff7f50',
	'#9acd32',
	'#ff4500',
	'#2e8b57',
	'#daa520',
	'#d2691e',
	'#5f9ea0',
	'#1e90ff',
	'#ff69b4',
	'#00ff7f',
	'#a244f9',
];
export function getUsernameColor(string: string): string {
	const hash = getStringHash(string);
	return colors[
		((hash % colors.length) + colors.length) % colors.length
	] as string;
}
