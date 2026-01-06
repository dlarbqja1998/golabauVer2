// src/lib/data/categoryIcons.js

// 1. 이미지 파일 경로를 문자열로 매핑합니다.
// (static 폴더에 있는 파일은 '/폴더명/파일명' 으로 바로 접근 가능)
export const categoryIconMap = {
    '한식': '/category-icons/hansik.png',
    '중식': '/category-icons/jungsik.png',
    '양식': '/category-icons/yangsik.png',
    '일식': '/category-icons/ilsik.png',
    '아시안': '/category-icons/asian.png',
    '분식': '/category-icons/bunsik.png',
    '치킨': '/category-icons/chiken.png', // 스크린샷 파일명 그대로 (오타 주의)
    '피자': '/category-icons/pizza.png',
    '고기': '/category-icons/gogi.png',
    '패스트푸드': '/category-icons/fastfood.png',
    '커피': '/category-icons/coffee.png',
    '술집': '/category-icons/suljip.png',
    '기타': '/category-icons/gita.png'
};

/**
 * 카테고리 이름을 받아서 이미지 경로(String)를 반환
 * 없으면 '기타' 이미지 반환
 */
export function getCategoryIconPath(categoryName) {
    return categoryIconMap[categoryName] || '/category-icons/gita.png';
}