const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('핑')
        .setDescription('봇의 지연 시간, 시스템 리소스 및 네이버 API 응답 속도를 확인합니다.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const startTime = Date.now();
        const apiLatency = Math.round(interaction.client.ws.ping);

        // 네이버 API 핑 테스트
        let naverApiStatusStr = '';
        const testPath = '/service/v1/channels/53c8344e2694f420e6e7683f124c8b2a';
        const targetUrl = `https://api.chzzk.naver.com${testPath}`;
        
        const nodeStart = Date.now();
        try {
            const res = await axios.get(targetUrl, { 
                timeout: 3000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                }
            });
            const duration = Date.now() - nodeStart;
            const success = res.data && (res.data.code === 200 || res.status === 200);
            naverApiStatusStr = success ? `🟢 정상 (\`${duration}ms\`)` : `🔴 오류 (\`CODE: ${res.status}\`)`;
        } catch (e) {
            naverApiStatusStr = `🔴 실패 (\`${e.response ? e.response.status : 'ERR'}\`)`;
        }

        const latency = Date.now() - startTime;

        // 업타임 계산
        const totalSeconds = Math.floor(process.uptime());
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const uptimeStr = `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;

        // 메모리 사용량
        const processMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const systemTotalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const systemFreeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const systemUsedMemory = (systemTotalMemory - systemFreeMemory).toFixed(2);

        // CPU 정보
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;

        const embed = new EmbedBuilder()
            .setColor(0x00ffa3)
            .setTitle('✨ 시스템 상태 및 네이버 API 현황')
            .addFields(
                { name: '📡 지연 시간 (Latency)', value: `> **Discord API**: \`${apiLatency}ms\`\n> **명령어 응답**: \`${latency}ms\``, inline: false },
                { name: '🔌 네이버 API 상태', value: `> ${naverApiStatusStr}`, inline: false },
                { name: '💻 시스템 정보', value: `> **CPU**: \`${cpuModel} (${cpuCores} Cores)\`\n> **RAM**: \`${systemUsedMemory} / ${systemTotalMemory} GB\``, inline: false },
                { name: '🤖 봇 상태', value: `> **메모리**: \`${processMemory} MB\`\n> **업타임**: \`${uptimeStr}\``, inline: false }
            )
            .setFooter({ text: `OS: ${os.type()} ${os.arch()} | Host: ${os.hostname()}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};