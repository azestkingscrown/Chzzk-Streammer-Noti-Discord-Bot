const axios = require('axios');

/**
 * 탐지 회피를 위한 랜덤 지연 (0.1s ~ 0.3s)
 */
const sleep = () => {
    const ms = Math.floor(Math.random() * 201) + 100;
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 치지직 API 호출 유틸리티 (로컬 직접 통신 전용)
 * @param {string} path API 경로
 * @param {object} options Axios 옵션
 */
async function fetchNaverApi(path, options = {}) {
    const isNngMain = path.startsWith('/nng_main');
    const baseDomain = isNngMain ? 'https://apis.naver.com' : 'https://api.chzzk.naver.com';
    const targetUrl = `${baseDomain}${path}`;

    await sleep();

    try {
        const response = await axios.get(targetUrl, {
            ...options,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                ...options.headers
            }
        });
        return response.data;
    } catch (error) {
        console.error(`[chzzkFetcher] Direct Naver API call failed: ${error.message}`);
        throw error;
    }
}

module.exports = { fetchNaverApi };
