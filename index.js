async function getData(url) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
    });
    return response.json();
}

async function loadCountriesData() {
    const countries = await getData('https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area');
    return countries.reduce((result, country) => {
        result[country.cca3] = country;
        return result;
    }, {});
}

const form = document.getElementById('form');
const fromCountry = document.getElementById('fromCountry');
const toCountry = document.getElementById('toCountry');
const countriesList = document.getElementById('countriesList');
const submit = document.getElementById('submit');
const output = document.getElementById('output');

(async () => {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;

    output.textContent = 'Loading…';
    const countriesData = await loadCountriesData();
    output.textContent = '';

    // Заполняем список стран для подсказки в инпутах
    Object.keys(countriesData)
        .sort((a, b) => countriesData[b].area - countriesData[a].area)
        .forEach((code) => {
            const option = document.createElement('option');
            option.value = countriesData[code].name.common;
            countriesList.appendChild(option);
        });

    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;

    const api = new SingleCountryAPI();

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        // TODO: Вывести, откуда и куда едем, и что идёт расчёт.
        // TODO: Рассчитать маршрут из одной страны в другую за минимум запросов.
        // TODO: Вывести маршрут и общее количество запросов.
        api.resetRequestCount();
        renderPendingMessage(fromCountry.value, toCountry.value);
        calculateRoute(fromCountry.value, toCountry.value, api).then(renderResult).then(makeElementsEnabled);
    });
})();

// API
function SingleCountryAPI() {
    let requestCount = 0;
    const countries = [];
    const urlTemplates = {
        cca3: (value) => {
            return `https://restcountries.com/v3.1/alpha/${value}?fields=name,borders,cca3`;
        },
        name: (value) => {
            return `https://restcountries.com/v3.1/name/${value}?fields=name,borders,cca3`;
        },
    };

    const buildUrl = (key, value) => {
        return urlTemplates[key](value);
    };

    const buildCountry = (countryData) => {
        if (Array.isArray(countryData)) {
            countryData = countryData[0];
        }

        const country = {
            name: countryData.name.common,
            cca3: countryData.cca3,
            borders: countryData.borders,
        };
        return country;
    };

    const loadCountry = async (url) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow',
        });
        if (!response.ok) {
            const message = `${response.status}`;
            throw new Error(message);
        }
        requestCount += 1;
        return response.json();
    };

    const getCountry = async (key, value) => {
        let country = countries.find((country) => country[key] === value);
        if (country) {
            return country;
        }

        const countryData = await loadCountry(buildUrl(key, value));
        country = buildCountry(countryData);
        countries.push(country);
        return country;
    };

    this.getCountryByCode = async (code) => {
        const country = await getCountry('cca3', code);
        return country;
    };

    this.getCountryByName = async (name) => {
        const country = await getCountry('name', name);
        return country;
    };

    this.getCountryCodeByName = async (name) => {
        const country = await this.getCountryByName(name);
        return country.cca3;
    };

    this.getCountryNameByCode = async (code) => {
        const country = await this.getCountryByCode(code);
        return country.name;
    };

    this.getCountryBordersByCode = async (code) => {
        const country = await this.getCountryByCode(code);
        return country.borders;
    };

    this.getCountriesArrayByCodes = async (codes) => {
        const result = [];

        for (const code of codes) {
            result.push(this.getCountryByCode(code));
        }
        return Promise.all(result);
    };

    this.getCountriesNamesArrayByCodes = async (codes) => {
        const countries = await this.getCountriesArrayByCodes(codes);
        return countries.map((country) => country.name);
    };

    // Загружаем коды стран, потенциально доступных из заданной
    this.getRelatedCountriesByCode = async (code) => {
        const visited = [];
        const walk = async (code) => {
            const borders = await this.getCountryBordersByCode(code);
            await Promise.all(
                borders
                    .filter((border) => !visited.includes(border))
                    .map((border) => {
                        visited.push(border);
                        return walk(border);
                    })
            );
        };
        await walk(code);
        return visited;
    };

    // Для удобства функция, возвращающая обеъект {cca3: [borders]} принимающая массив [cca3]
    this.getCodesToBordersObj = async (codes) => {
        const countries = await this.getCountriesArrayByCodes(codes);

        return countries.reduce((result, country) => {
            result[country.cca3] = country.borders;
            return result;
        }, {});
    };

    this.getRequestCount = () => {
        return requestCount;
    };

    this.resetRequestCount = () => {
        requestCount = 0;
    };
}

async function calculateRoute(fromCountry, toCountry, api) {
    if (!fromCountry || !toCountry) {
        return { errorMessage: 'Fields cannot be empty!' };
    }

    const maxDistance = 10;

    if (fromCountry === toCountry) {
        return { message: 'You are alredy here!' };
    }

    let fromCountryCode;
    let toCountryCode;

    let fromCountryBorders;
    let toCountryBorders;

    let hasSolution = false;

    const routes = [];

    const buildErrorMessage = (error, addedMessage) => {
        return `Something went wrong. ${error}. ${addedMessage}`;
    };

    try {
        fromCountryCode = await api.getCountryCodeByName(fromCountry);
        toCountryCode = await api.getCountryCodeByName(toCountry);

        fromCountryBorders = await api.getCountryBordersByCode(fromCountryCode);
        toCountryBorders = await api.getCountryBordersByCode(toCountryCode);
    } catch (error) {
        console.error(error);
        return {
            errorMessage: buildErrorMessage(error, 'Check the input data.'),
        };
    }

    // Оптимизация для случая, когда начальная или конечная страны острова
    if (fromCountryBorders.length === 0 || toCountryBorders.length === 0) {
        return {
            message: 'One or both countries are islands, route is not possible!',
            requestCount: api.getRequestCount().toString(),
        };
    }

    // Оптимизация для случая, когда начальная и конечная страны граничат
    if (fromCountryBorders.includes(toCountryCode)) {
        routes.push([toCountryCode, fromCountryCode]);
        hasSolution = true;
    }

    // Если из прошлых условий ничего не выполнилось, загружаем расширенные данные
    let relatedCountries;
    let bordersByCode;

    if (!hasSolution) {
        try {
            relatedCountries = await api.getRelatedCountriesByCode(fromCountryCode);
            bordersByCode = await api.getCodesToBordersObj(relatedCountries);
        } catch (error) {
            return { errorMessage: buildErrorMessage(error) };
        }

        // Теперь мы можем проверить, доступен ли в принципе сухопутный маршрут

        if (!relatedCountries.includes(toCountryCode)) {
            return {
                message: 'Route is not possible, countries belog defferent continents!',
                requestCount: api.getRequestCount().toString(),
            };
        }
    }

    // И далее вычисляем оптимальные маршруты, используя алгоритм Дейкстры(или что-то по мотивам:) )

    // Здесь хранится для каждой страны предшественники,
    // через которые лежат кратчайшие расстояния до старта
    const parents = {};

    function bfs() {
        // Здесь будут расстояния от каждой страны до текущей
        const dist = {};

        for (const key in bordersByCode) {
            dist[key] = Infinity;
        }

        dist[fromCountryCode] = 0;

        const queue = [fromCountryCode];
        parents[fromCountryCode] = [null];

        while (queue.length > 0) {
            const currentCountryCode = queue.shift();

            const borders = bordersByCode[currentCountryCode];

            for (const borderCountryCode of borders) {
                if (dist[borderCountryCode] > dist[currentCountryCode] + 1) {
                    // Нашли более короткий маршрут от borderCountry или просто нашли его, если не было
                    dist[borderCountryCode] = dist[currentCountryCode] + 1;

                    queue.push(borderCountryCode);
                    parents[borderCountryCode] = [currentCountryCode];
                } else if (dist[borderCountryCode] === dist[currentCountryCode] + 1) {
                    parents[borderCountryCode].push(currentCountryCode);
                }
            }
        }
    }

    function findOptimalRoutes(route = [], countryCode = toCountryCode) {
        if (countryCode === null) {
            routes.push([...route]);
            return;
        }

        for (const parentCountryCode of parents[countryCode]) {
            route.push(countryCode);
            findOptimalRoutes(route, parentCountryCode);
            route.pop();
        }
    }

    let routesNames = [];

    if (!hasSolution) {
        bfs();
        findOptimalRoutes();
        if (routes.length > 0 && routes.length <= maxDistance) {
            routes.map((route) => route.reverse());
            hasSolution = true;
        }
    }

    try {
        const promises = [];
        routes.forEach((route) => promises.push(api.getCountriesNamesArrayByCodes(route)));
        routesNames = await Promise.all(promises);
    } catch (error) {
        console.error(error);
        return { errorMessage: buildErrorMessage(error) };
    }
    return {
        routes: hasSolution ? routesNames : null,
        requestCount: api.getRequestCount().toString(),
        message: hasSolution ? null : "The route is too long or dosen't exist...",
    };
}

function renderResult(data) {
    output.textContent = '';
    if (data.errorMessage) {
        output.insertAdjacentHTML('afterbegin', `<div class = "errorMessage">${data.errorMessage}</div>`);
        return;
    }

    if (data.message) {
        output.insertAdjacentHTML('afterbegin', `<div class = "message">${data.message}</div>`);
    }
    if (data.routes) {
        output.insertAdjacentHTML('afterbegin', '<div class="mui--text-headline">Result</div>');
        const resultList = document.createElement('ul');
        output.appendChild(resultList);
        for (const route of data.routes) {
            resultList.insertAdjacentHTML('beforeend', `<li>${routeToString(route)}</li>`);
        }
    }

    if (data.requestCount) {
        output.insertAdjacentHTML('beforeend', `<div>Count of requests: ${data.requestCount}</div>`);
    }

    function routeToString(route) {
        return route.join(' \u2192 ');
    }
}

function renderPendingMessage(from, to) {
    makeElementsDisbled();
    output.textContent = `Calculation of shortest routes from ${from} to ${to} in progress…`;
}

function makeElementsDisbled() {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;
}

function makeElementsEnabled() {
    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;
}
