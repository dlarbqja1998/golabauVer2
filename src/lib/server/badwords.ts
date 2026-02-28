// 차단할 욕설 리스트 (필요한 만큼 계속 추가해!)
const BAD_WORDS = [
    '시발', '씨발', '병신', '개새끼', '지랄', '좆', '썅', '시1발'
];

// 텍스트를 받아서 욕설이 포함되어 있으면 true를 반환하는 함수
export function containsBadWord(text: string): boolean {
    if (!text) return false;
    
    // 띄어쓰기 다 무시하고 검사하려면 정규식 쓸 수도 있지만, 일단은 단순 포함 여부로 체크
    const cleanText = text.replace(/\s+/g, ''); // 공백 제거 (예: '시 발' 도 잡아내기 위해)
    
    return BAD_WORDS.some(word => cleanText.includes(word));
}