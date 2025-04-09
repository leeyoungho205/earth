import * as THREE from 'three';
import { createEarthquakeMarkers } from './earthquakeMarkers.js';
import { createVolcanoMarkers, loadVolcanoData } from './volcanoMarkers.js';
import { createCountryBorders, loadCountryData } from './countryBorders.js';

let earthquakeData = null;
let earthquakeMarkersGroup = null;
let earthquakesVisible = false;
let volcanoData = null;
let volcanoMarkersGroup = null;
let volcanoesVisible = false;
let countryBordersGroup = null;
let countryBordersVisible = false;

// --- UI 초기화 함수 ---
function initUI(scene, earthMesh) {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '10px';
    uiContainer.style.right = '10px';
    uiContainer.style.zIndex = '100';
    uiContainer.style.display = 'flex';
    uiContainer.style.flexDirection = 'column';
    uiContainer.style.gap = '5px';
    document.body.appendChild(uiContainer);

    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-earthquakes-btn';
    toggleButton.textContent = '지진 데이터 보기';
    toggleButton.style.padding = '8px 12px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.addEventListener('click', () => toggleEarthquakes(scene, earthMesh));
    uiContainer.appendChild(toggleButton);

    const volcanoButton = document.createElement('button');
    volcanoButton.id = 'toggle-volcanoes-btn';
    volcanoButton.textContent = '화산대 보기';
    volcanoButton.style.padding = '8px 12px';
    volcanoButton.style.cursor = 'pointer';
    volcanoButton.addEventListener('click', () => toggleVolcanoes(scene, earthMesh));
    uiContainer.appendChild(volcanoButton);

    const bordersButton = document.createElement('button');
    bordersButton.id = 'toggle-borders-btn';
    bordersButton.textContent = '국가 경계선 보기';
    bordersButton.style.padding = '8px 12px';
    bordersButton.style.cursor = 'pointer';
    bordersButton.addEventListener('click', () => toggleCountryBorders(scene, earthMesh));
    uiContainer.appendChild(bordersButton);
}

// --- 지진 데이터 로드 함수 (수정: 디버깅 로그 추가) ---
async function loadEarthquakeData() {
    if (earthquakeData) {
        console.log('Using cached earthquake data.'); // 캐시된 데이터 사용 로그 추가
        return earthquakeData;
    }

    console.log('Loading earthquake data from CSV...'); // 로딩 시작 로그 추가
    try {
        const response = await fetch('./database.csv');
        if (!response.ok) {
            // HTTP 오류 시 상태 코드와 텍스트를 함께 로깅
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const csvText = await response.text();
        console.log('CSV data fetched successfully.'); // CSV 로드 성공 로그

        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            console.warn('CSV file is empty or contains only header.');
            earthquakeData = []; // 빈 배열로 초기화
            return earthquakeData;
        }

        const header = lines[0].split(',').map(h => h.trim());
        // 헤더 로그 추가
        console.log('CSV Header:', header);
        const expectedHeader = ['Date', 'Time', 'Latitude', 'Longitude', 'Depth', 'Magnitude', 'Location Source'];

        if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
            console.warn('CSV header does not match expected format. Expected:', expectedHeader, 'Got:', header);
            // 헤더 불일치 경고 강화
        }

        // 데이터 제한: 최대 500개만 처리 (또는 원하는 숫자로 조정)
        const MAX_RECORDS = 5000;
        // 또는 최근 데이터만 사용하려면: const processLines = lines.slice(1, MAX_RECORDS + 1);
        // 무작위 샘플링을 위한 코드:
        const dataLines = lines.slice(1);
        let processLines;
        
        if (dataLines.length > MAX_RECORDS) {
            console.log(`Limiting data to ${MAX_RECORDS} records out of ${dataLines.length}`);
            // 무작위 샘플링
            processLines = [lines[0]]; // 헤더 유지
            
            // 방법 1: 일정 간격으로 샘플링
            const step = Math.floor(dataLines.length / MAX_RECORDS);
            for (let i = 0; i < dataLines.length; i += step) {
                if (processLines.length <= MAX_RECORDS) {
                    processLines.push(dataLines[i]);
                }
            }
            
            // 방법 2: 무작위 샘플링 (대안)
            /*
            const shuffled = [...dataLines].sort(() => 0.5 - Math.random());
            processLines = processLines.concat(shuffled.slice(0, MAX_RECORDS));
            */
        } else {
            processLines = dataLines;
        }

        const earthquakes = [];
        for (let i = 0; i < processLines.length; i++) {
            const values = processLines[i].split(',');

            if (values.length === header.length) {
                try {
                    const earthquake = {
                        id: `csv_${i}`,
                        date: values[0].trim(),
                        time: values[1].trim(),
                        latitude: parseFloat(values[2]),
                        longitude: parseFloat(values[3]),
                        depth: parseFloat(values[4]),
                        magnitude: parseFloat(values[5]),
                        magType: 'unknown',
                        timestamp: new Date(`${values[0].trim()}T${values[1].trim()}Z`).getTime(),
                        place: values[6].trim()
                    };

                    if (!isNaN(earthquake.latitude) && !isNaN(earthquake.longitude) && !isNaN(earthquake.magnitude)) {
                        earthquakes.push(earthquake);
                    } else {
                        console.warn(`Skipping row ${i} due to invalid number format: ${processLines[i]}`);
                    }
                } catch(e) {
                     console.warn(`Error processing row ${i}: ${processLines[i]}`, e);
                }
            } else {
                console.warn(`Skipping row ${i} due to incorrect column count (${values.length} columns, expected ${header.length}): ${processLines[i]}`);
            }
        }

        earthquakeData = earthquakes;
        // 파싱된 데이터 개수 및 첫 번째 데이터 로그 추가
        console.log('Earthquake data parsed successfully:', earthquakeData.length, 'records');
        if (earthquakeData.length > 0) {
            console.log('First earthquake data sample:', earthquakeData[0]);
        }
        return earthquakeData;

    } catch (error) {
        // 오류 발생 시 더 자세한 정보 로깅
        console.error('Could not load or parse earthquake CSV data:', error.message, error.stack);
        earthquakeData = null; // 오류 시 데이터 null 처리 명시
        return null;
    }
}

// --- 지진 마커 토글 함수 (수정: 디버깅 로그 추가) ---
async function toggleEarthquakes(scene, earthMesh) {
    const button = document.getElementById('toggle-earthquakes-btn');
    console.log('Toggling earthquakes. Current visibility:', earthquakesVisible); // 토글 시작 로그

    if (!earthquakesVisible) {
        button.textContent = '데이터 로딩 중...'; // 로딩 상태 표시
        button.disabled = true; // 버튼 비활성화

        try { // 오류 처리를 위해 try...catch 추가
            if (!earthquakeMarkersGroup) {
                console.log('Earthquake markers group does not exist. Loading data...');
                const data = await loadEarthquakeData();
                // 로드된 데이터 확인 로그
                console.log('Earthquake data loaded:', data ? `${data.length} records` : 'null');

                if (data && data.length > 0) {
                    console.log('Creating earthquake markers...');
                    // createEarthquakeMarkers 함수 호출 전 로그
                    earthquakeMarkersGroup = createEarthquakeMarkers(data, earthMesh);
                    // 생성된 마커 그룹 확인 로그
                    console.log('Earthquake markers created:', earthquakeMarkersGroup);

                    if (earthquakeMarkersGroup instanceof THREE.Group) { // 반환값이 Group 객체인지 확인
                        console.log('Adding earthquake markers group to earthMesh...');
                        earthMesh.add(earthquakeMarkersGroup);
                        console.log('Earthquake markers added to earthMesh.');
                    } else {
                        console.error('createEarthquakeMarkers did not return a valid THREE.Group object.');
                        alert('지진 마커를 생성하는 데 실패했습니다. 콘솔 로그를 확인하세요.');
                        button.textContent = '지진 데이터 보기'; // 버튼 텍스트 복원
                        button.disabled = false; // 버튼 활성화
                        return;
                    }
                } else {
                    console.warn('No valid earthquake data loaded or parsed.'); // 데이터 없음 경고
                    alert('지진 데이터를 불러오거나 파싱하는 데 실패했습니다.');
                    button.textContent = '지진 데이터 보기'; // 버튼 텍스트 복원
                    button.disabled = false; // 버튼 활성화
                    return;
                }
            }

            if (earthquakeMarkersGroup) {
                console.log('Setting earthquake markers visibility to true.');
                earthquakeMarkersGroup.visible = true;
                earthquakesVisible = true;
                button.textContent = '지진 데이터 숨기기';
                console.log('Earthquake markers shown.');
            }
        } catch (error) { // 토글 로직 중 발생한 오류 처리
            console.error('Error during showing earthquakes:', error);
            alert('지진 데이터를 표시하는 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.');
            button.textContent = '지진 데이터 보기'; // 오류 시 버튼 상태 복원
        } finally {
            button.disabled = false; // 작업 완료 후 버튼 활성화
        }

    } else {
        if (earthquakeMarkersGroup) {
            console.log('Setting earthquake markers visibility to false.');
            earthquakeMarkersGroup.visible = false;
            earthquakesVisible = false;
            button.textContent = '지진 데이터 보기';
            console.log('Earthquake markers hidden.');
        } else {
            // 숨기려고 할 때 마커 그룹이 없는 경우 (이론상 발생하기 어려움)
             console.warn('Attempted to hide markers, but earthquakeMarkersGroup is null.');
             earthquakesVisible = false; // 상태 동기화
             button.textContent = '지진 데이터 보기';
        }
    }
}

// --- 화산 마커 토글 함수 ---
async function toggleVolcanoes(scene, earthMesh) {
    const button = document.getElementById('toggle-volcanoes-btn');
    console.log('Toggling volcanoes. Current visibility:', volcanoesVisible);

    if (!volcanoesVisible) {
        button.textContent = '데이터 로딩 중...';
        button.disabled = true;

        try {
            if (!volcanoMarkersGroup) {
                console.log('Volcano markers group does not exist. Loading data...');
                const data = await loadVolcanoData();
                console.log('Volcano data loaded:', data ? `${data.length} records` : 'null');

                if (data && data.length > 0) {
                    console.log('Creating volcano markers...');
                    volcanoMarkersGroup = createVolcanoMarkers(data, earthMesh);
                    console.log('Volcano markers created:', volcanoMarkersGroup);

                    if (volcanoMarkersGroup instanceof THREE.Group) {
                        console.log('Adding volcano markers group to earthMesh...');
                        earthMesh.add(volcanoMarkersGroup);
                        console.log('Volcano markers added to earthMesh.');
                    } else {
                        console.error('createVolcanoMarkers did not return a valid THREE.Group object.');
                        alert('화산 마커를 생성하는 데 실패했습니다. 콘솔 로그를 확인하세요.');
                        button.textContent = '화산대 보기';
                        button.disabled = false;
                        return;
                    }
                } else {
                    console.warn('No valid volcano data loaded or parsed.');
                    alert('화산 데이터를 불러오거나 파싱하는 데 실패했습니다.');
                    button.textContent = '화산대 보기';
                    button.disabled = false;
                    return;
                }
            }

            if (volcanoMarkersGroup) {
                console.log('Setting volcano markers visibility to true.');
                volcanoMarkersGroup.visible = true;
                volcanoesVisible = true;
                button.textContent = '화산대 숨기기';
                console.log('Volcano markers shown.');
            }
        } catch (error) {
            console.error('Error during showing volcanoes:', error);
            alert('화산 데이터를 표시하는 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.');
            button.textContent = '화산대 보기';
        } finally {
            button.disabled = false;
        }

    } else {
        if (volcanoMarkersGroup) {
            console.log('Setting volcano markers visibility to false.');
            volcanoMarkersGroup.visible = false;
            volcanoesVisible = false;
            button.textContent = '화산대 보기';
            console.log('Volcano markers hidden.');
        } else {
            console.warn('Attempted to hide markers, but volcanoMarkersGroup is null.');
            volcanoesVisible = false;
            button.textContent = '화산대 보기';
        }
    }
}

// --- 국가 경계선 토글 함수 ---
async function toggleCountryBorders(scene, earthMesh) {
    const button = document.getElementById('toggle-borders-btn');
    console.log('Toggling country borders. Current visibility:', countryBordersVisible);

    if (!countryBordersVisible) {
        button.textContent = '데이터 로딩 중...';
        button.disabled = true;

        try {
            if (!countryBordersGroup) {
                console.log('Country borders group does not exist. Loading data...');
                const data = await loadCountryData();
                console.log('Country data loaded:', data ? `${data.length} countries` : 'null');

                if (data && data.length > 0) {
                    console.log('Creating country borders...');
                    countryBordersGroup = createCountryBorders(data, earthMesh);
                    console.log('Country borders created:', countryBordersGroup);

                    if (countryBordersGroup instanceof THREE.Group) {
                        console.log('Adding country borders group to earthMesh...');
                        earthMesh.add(countryBordersGroup);
                        console.log('Country borders added to earthMesh.');
                    } else {
                        console.error('createCountryBorders did not return a valid THREE.Group object.');
                        alert('국가 경계선을 생성하는 데 실패했습니다. 콘솔 로그를 확인하세요.');
                        button.textContent = '국가 경계선 보기';
                        button.disabled = false;
                        return;
                    }
                } else {
                    console.warn('No valid country data loaded or parsed.');
                    alert('국가 데이터를 불러오거나 파싱하는 데 실패했습니다.');
                    button.textContent = '국가 경계선 보기';
                    button.disabled = false;
                    return;
                }
            }

            if (countryBordersGroup) {
                console.log('Setting country borders visibility to true.');
                countryBordersGroup.visible = true;
                countryBordersVisible = true;
                button.textContent = '국가 경계선 숨기기';
                console.log('Country borders shown.');
            }
        } catch (error) {
            console.error('Error during showing country borders:', error);
            console.error('Error stack:', error.stack);
            alert('국가 경계선을 표시하는 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.');
            button.textContent = '국가 경계선 보기';
        } finally {
            button.disabled = false;
        }

    } else {
        if (countryBordersGroup) {
            console.log('Setting country borders visibility to false.');
            countryBordersGroup.visible = false;
            countryBordersVisible = false;
            button.textContent = '국가 경계선 보기';
            console.log('Country borders hidden.');
        } else {
            console.warn('Attempted to hide borders, but countryBordersGroup is null.');
            countryBordersVisible = false;
            button.textContent = '국가 경계선 보기';
        }
    }
}

// ui.js 초기화 함수 내보내기
export { initUI };