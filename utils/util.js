const fs = require("fs");
const path = require('path');
const configPath = path.join(__dirname, '../config.json');
const { fetchNaverApi } = require('./chzzkFetcher');

let { api } = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const utilItem = {};

/**
 * URL에서 도메인을 제외한 경로(path + query)만 추출하는 함수
 */
function getPathOnly(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.pathname + parsedUrl.search;
    } catch (e) {
        // 이미 경로 형태인 경우 그대로 반환
        return url;
    }
}

// 실시간으로 config 파일을 다시 읽어 API 주소를 갱신하는 함수
utilItem.reloadApiConfig = function() {
    try {
        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        api = newConfig.api;
        return true;
    } catch (err) {
        console.error("API 설정 갱신 실패:", err);
        return false;
    }
};

utilItem.getChannelInfo = async function (streamerId) {
    try {
        const fullUrl = api.channel.replace('{streamerId}', streamerId);
        const path = getPathOnly(fullUrl);
        
        const getData = await fetchNaverApi(path);

        if (getData.code === 200 && getData.content) {
            const content = getData.content;
            return {
                result: 200,
                name: content.channelName,
                profile: content.channelImageUrl || "https://ssl.pstatic.net/static/nng/glive/icon_profile_default.png"
            };
        }
        return { result: getData.code };
    } catch (err) {
        utilItem.importLog(`채널 API 예외 발생: ${err.message} (${streamerId})`);
        return { result: 404 };
    }
}

utilItem.getCommunityRecentlyInfo = async function (streamerId) {
    try {
        const fullUrl = api.community.replace('{streamerId}', streamerId);
        const path = getPathOnly(fullUrl);
        
        const getData = await fetchNaverApi(path, {
            headers: {
                'Content-Type': "application/xml"
            }
        });

        if (getData.code === 200 && getData.content && getData.content.comments && getData.content.comments.data.length > 0) {
            const comment = getData.content.comments.data[0];
            const commentData = comment.comment;
            
            return {
                result: 200,
                name: comment.user.userNickname,
                profile: comment.user.profileImageUrl || "https://ssl.pstatic.net/static/nng/glive/icon_profile_default.png",
                communityId: commentData.commentId,
                contents: commentData.content,
                img: commentData.attaches ? commentData.attaches[0].attachValue : null
            };
        }
        return { result: 404 };
    } catch (err) {
        utilItem.importLog(`커뮤니티 API 예외 발생: ${err.message} (${streamerId})`);
        return { result: 404 };
    }
}

utilItem.getLiveInfo = async function (streamerId) {
    try {
        const fullUrl = api.live.replace('{streamerId}', streamerId);
        const path = getPathOnly(fullUrl);
        
        const getData = await fetchNaverApi(path);

        if (getData.code === 200 && getData.content) {
            const content = getData.content;
            return {
                status: content.status, // "OPEN" 또는 "CLOSE"
                liveId: content.liveId,
                liveTitle: content.liveTitle,
                liveCategoryValue: content.liveCategoryValue,
                liveImageUrl: content.liveImageUrl,
                channelName: content.channel.channelName,
                channelProfile: content.channel.channelImageUrl || "https://ssl.pstatic.net/static/nng/glive/icon_profile_default.png",
                result: 200
            };
        }
        return { result: getData.code };
    } catch (err) {
        utilItem.importLog(`라이브 API 예외 발생: ${err.message} (${streamerId})`);
        return { result: 404 };
    }
}

utilItem.searchStreamer = async function (keyword) {
    try {
        const fullUrl = api.search.replace('{keyword}', encodeURIComponent(keyword));
        const path = getPathOnly(fullUrl);
        
        const getData = await fetchNaverApi(path);

        if (getData.code === 200 && getData.content && getData.content.data.length > 0) {
            const channel = getData.content.data[0].channel;
            return {
                id: channel.channelId,
                name: channel.channelName,
                profile: channel.channelImageUrl || "https://ssl.pstatic.net/static/nng/glive/icon_profile_default.png",
                result: 200
            };
        }
        return { result: 404 }; // Not Found
    } catch (err) {
        return { result: 404 };
    }
}

utilItem.importLog = function (content) {
    // 현재 날짜 정보 가져오기
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const fileName = `${year}-${month}-${day}.log`;

    // 로그 폴더 경로와 파일 경로
    const logDir = path.join(__dirname, 'log');
    const logFilePath = path.join(logDir, fileName);

    // 로그 내용 포맷 (현재 시간 + 메시지)
    const timestamp = now.toLocaleTimeString();
    const logMessage = `[${timestamp}] ${content}\n`;

    // 로그 폴더가 없으면 생성
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // 파일에 로그 추가
    fs.appendFileSync(logFilePath, logMessage, 'utf8');
}

module.exports = utilItem;