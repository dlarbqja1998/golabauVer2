// src/lib/server/scraper.ts
import * as cheerio from 'cheerio';

export interface CafeteriaMenu {
	date: string; // 날짜 (예: 2024.02.19)
	day: string;  // 요일 (예: 월)
	student: {
		korean: string[]; // 중식-한식
		special: string[]; // 중식-일품
		snack: string[];   // 중식-분식
		dinner: string[];  // 석식
	};
	faculty: {
		lunch: string[]; // 교직원 중식
	};
}

export async function getCafeteriaMenu(): Promise<CafeteriaMenu[]> {
	// 학교 식단표 URL (고려대 세종캠퍼스)
	const URL = 'https://fund.korea.ac.kr/koreaSejong/8028/subview.do';

	try {
		const response = await fetch(URL);
		if (!response.ok) throw new Error('학교 홈페이지 접속 실패');
		
		const html = await response.text();
		const $ = cheerio.load(html);
		const menus: CafeteriaMenu[] = [];

		// 홈페이지 테이블 구조: tbody > tr 반복
		// 보통 _artclTbl 클래스를 가진 테이블을 찾습니다.
		$('table._artclTbl tbody tr').each((i, el) => {
			const tds = $(el).find('td');
			
			// td가 충분하지 않으면 패스 (헤더나 빈 줄일 수 있음)
			if (tds.length < 6) return;

            // 1번째 컬럼: 날짜 (2024.02.19 (월) 형태)
            const dateRaw = $(tds[0]).text().trim(); 
            // 날짜와 요일 분리
            const dateMatch = dateRaw.match(/^(\d{4}\.\d{2}\.\d{2})/);
            const dayMatch = dateRaw.match(/\((.)\)/);

            const date = dateMatch ? dateMatch[1] : dateRaw; // "2024.02.19"
            const day = dayMatch ? dayMatch[1] : '';         // "월"

			// 데이터 정제 함수 (지저분한 공백, 쉼표 제거)
			const parseMenu = (text: string) => {
				if (!text) return [];
				return text
					.split(/\r\n|\n|,/) // 줄바꿈이나 쉼표로 분리
					.map(item => item.trim())
					.filter(item => item !== '' && item !== 'Top'); // 빈값 및 'Top' 제거
			};

            // 컬럼 순서 (홈페이지 기준):
            // 0: 날짜, 1: 교직원, 2: 학생(한식), 3: 학생(일품), 4: 학생(양식/분식), 5: 학생(석식)
            
            const facultyLunch = parseMenu($(tds[1]).text());
            const studentKorean = parseMenu($(tds[2]).text());
            const studentSpecial = parseMenu($(tds[3]).text());
            const studentSnack = parseMenu($(tds[4]).text()); 
            const studentDinner = parseMenu($(tds[5]).text());

			menus.push({
				date,
                day,
				student: {
					korean: studentKorean,
					special: studentSpecial,
					snack: studentSnack,
					dinner: studentDinner
				},
				faculty: {
					lunch: facultyLunch
				}
			});
		});

		return menus;

	} catch (error) {
		console.error('크롤링 에러:', error);
		// 에러 나면 빈 배열 반환해서 사이트가 터지지는 않게 함
		return [];
	}
}