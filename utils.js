const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CACHE_DIR = path.join(__dirname, 'cache');

async function cachedFetch(url) {
	const hash = crypto.createHash('sha256').update(url).digest('hex');
	const cacheFile = path.join(CACHE_DIR, hash + '.json');

	try {
		const rawData = await fs.promises.readFile(cacheFile, {encoding: 'utf-8'});
		return {
			status: 200,
			json: (async() => {
				return JSON.parse(rawData);
			}),
		};
	} catch (e) {
		; // Ignore
	}

	const response = await fetch(url);
	if (response.status !== 200) {
		throw new Error(`GET ${url} failed with HTTP ${response.status}`);
	}
	const textData = await response.text();
	if (textData) {
		await fs.promises.mkdir(CACHE_DIR, { recursive: true });
		await fs.promises.writeFile(cacheFile, textData, {encoding: 'utf-8'});
	}

	return {
		status: 200,
		json: (async() => {
			return JSON.parse(textData);
		}),
	};
}

function percent(count, totalCount) {
	const res = +(count * 100 / totalCount).toFixed(1);
	return `${res}%`;
}

function shuffleArray(array) {
	// From https://stackoverflow.com/a/12646864/35070
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

module.exports = {
	cachedFetch,
	shuffleArray,
	percent,
};
