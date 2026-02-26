process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // 인증서 무시 
import { load } from 'cheerio';

export async function getCafeteriaMenu() {
    // 1. 오늘 날짜 포맷팅 ("02.24")
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const targetDate = `${month}.${day}`; 

    const url = 'https://sejong.korea.ac.kr/campuslife/facilities/dining/weeklymenu'; 

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("네트워크 에러");
        
        const html = await response.text();
        const $ = load(html);

        let todayColumnIndex = -1;

        // 2. thead th에서 오늘 날짜 인덱스 찾기
        $('table thead th').each((index, element) => {
            if ($(element).text().includes(targetDate)) {
                todayColumnIndex = index;
            }
        });

        if (todayColumnIndex === -1) {
            return "오늘은 학식 메뉴가 없습니다.";
        }

        // 3. tbody의 첫 번째 줄(보통 중식)에서 정확한 td 칸 찾기
        const targetTd = $('table tbody tr').first().children().eq(todayColumnIndex);
        
        // 🔥 4. [핵심] .offTxt 클래스가 있으면 그걸 쓰고, 없으면 <td> 전체 HTML을 가져옵니다!
        let rawMenuHtml = targetTd.find('.offTxt').html();
        if (!rawMenuHtml || rawMenuHtml.trim() === '') {
            rawMenuHtml = targetTd.html(); // 백업 플랜 작동
        }

        if (!rawMenuHtml) {
            return "오늘 등록된 메뉴가 없습니다.";
        }

        // 5. 텍스트 예쁘게 다듬기
        const cleanMenuText = rawMenuHtml
            .replace(/<br\s*[\/]?>/gi, '\n') // <br> 태그를 줄바꿈으로 변경
            .replace(/<[^>]+>/g, '')         // 나머지 모든 HTML 태그 박멸
            .replace(/"/g, '')               // " 닭볶음 " 쌍따옴표 박멸
            .split('\n')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .join(', ');

        return cleanMenuText;

    } catch (error) {
        console.error("학식 크롤링 실패:", error);
        return "학식 메뉴를 불러오지 못했습니다. 🥲";
    }
}