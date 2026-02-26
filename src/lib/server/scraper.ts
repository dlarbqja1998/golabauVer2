process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // 인증서 무시 
import { load } from 'cheerio';

// 🔥 타입스크립트에게 데이터 모양을 미리 알려줍니다 (빨간줄 해결 핵심!)
interface MenuResult {
    student: {
        korean: string[];
        special: string[];
        snack: string[];
        dinner: string[];
    };
    faculty: {
        lunch: string[];
    };
}

export async function getCafeteriaMenu() {
    // 1. 오늘 날짜 포맷팅 ("02.26")
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const targetDate = `${month}.${day}`; 

    const url = 'https://fund.korea.ac.kr/koreaSejong/8028/subview.do'; 

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) throw new Error(`네트워크 에러: HTTP 상태 코드 ${response.status}`);
        
        const html = await response.text();
        const $ = load(html);

        // 🔥 위에서 만든 MenuResult 타입을 적용해서 빨간 줄을 없앱니다!
        const result: MenuResult = {
            student: {
                korean: [],
                special: [],
                snack: [],
                dinner: []
            },
            faculty: {
                lunch: []
            }
        };

        let foundMenu = false;

        // 2. .diet-menu 클래스를 가진 테이블 그룹을 각각 돌면서 찾기
        $('.diet-menu').each((_, menuDiv) => {
            const title = $(menuDiv).find('.title').text();
            const isStudent = title.includes('학생');
            const isFaculty = title.includes('교직원');

            if (!isStudent && !isFaculty) return;

            let todayColumnIndex = -1;
            
            // 해당 식단표의 thead에서 오늘 날짜 인덱스 찾기
            $(menuDiv).find('table thead th').each((index, element) => {
                if ($(element).text().includes(targetDate)) {
                    todayColumnIndex = index;
                }
            });

            if (todayColumnIndex === -1) return; // 오늘 날짜가 없으면 패스

            let currentRowTitle = "";

            // tbody의 각 줄(tr)을 돌면서 메뉴 추출
            $(menuDiv).find('table tbody tr').each((_, tr) => {
                const th = $(tr).find('th');
                // th가 있는 줄이면 메뉴 분류(중식-한식 등) 이름 업데이트
                if (th.length > 0) {
                    currentRowTitle = th.text().trim();
                }

                // td들만 추출 (첫번째칸이 th이므로, 실제 td 인덱스는 1을 빼주어야 함)
                const tds = $(tr).find('td');
                const targetTd = tds.eq(todayColumnIndex - 1);
                
                let rawMenuHtml = targetTd.find('.offTxt').html();
                if (!rawMenuHtml || rawMenuHtml.trim() === '') {
                    rawMenuHtml = targetTd.html(); 
                }

                if (!rawMenuHtml) return;
                
                rawMenuHtml = rawMenuHtml.replace(/&nbsp;/g, '').trim();
                if (rawMenuHtml === '') return;

                // 텍스트 다듬기 (배열로 변환)
                const menuArray = rawMenuHtml
                    .replace(/<br\s*[\/]?>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/"/g, '')
                    .split('\n')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);

                if (menuArray.length > 0) {
                    foundMenu = true;
                    // 추출한 배열을 카테고리에 맞게 쏙쏙 넣어주기 (빨간 줄 해결됨!)
                    if (isFaculty && currentRowTitle.includes('중식')) {
                        result.faculty.lunch.push(...menuArray);
                    } else if (isStudent) {
                        if (currentRowTitle.includes('한식')) {
                            result.student.korean.push(...menuArray);
                        } else if (currentRowTitle.includes('일품')) {
                            result.student.special.push(...menuArray);
                        } else if (currentRowTitle.includes('분식')) {
                            result.student.snack.push(...menuArray);
                        } else if (currentRowTitle.includes('석식')) {
                            result.student.dinner.push(...menuArray);
                        }
                    }
                }
            });
        });

        if (!foundMenu) {
            return "오늘 등록된 메뉴가 없습니다.";
        }

        return result;

    } catch (error) {
        console.error("학식 크롤링 실패:", error);
        return "학식 메뉴를 불러오지 못했습니다. 🥲";
    }
}