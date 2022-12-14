# Домашнее задание по JS, вторая лекция

## Кому и когда сдавать

Иван Петропольский, фронтенд-разработчик в команде Монетизации.

Домашки принимаются до 30-го декабря включительно в Mattermost в личке.

Если что-то непонятно или не получается сделать — приходите в Mattermost.

## Задание

Расчитать сухопутный маршрут из одной страны в другую с помощью [Rest Countries API](https://restcountries.com/#api-endpoints-v3),
сделав минимум запросов. Код должен работать _асинхронно_ через API получения _отдельной страны_.

В API можно получить все данные о стране по коду `cca3` (что бы это ни было) так: https://restcountries.com/v3.1/alpha/{cca3}

В поле `borders` лежат коды соседних стран. Нужно вывести в `output` (см. index.html) список стран, по которым нужно проехать,
чтобы попасть из `fromCountry` в `toCountry` (используя `borders`), и количество сделанных запросов.

Чтобы ответ ограничился определёнными полями, добавьте параметр `fields`. Например:
https://restcountries.com/v3.1/alpha/AUT?fields=name&fields=borders&fields=area
```json
{
    "name": {
        "common": "Austria",
        "official": "Republic of Austria",
        "nativeName": {
            "bar": {
                "official": "Republik Österreich",
                "common": "Österreich"
            }
        }
    },
    "capital": [
        "Vienna"
    ],
    "altSpellings": [
        "AT",
        "Osterreich",
        "Oesterreich"
    ],
    "borders": [
        "CZE",
        "DEU",
        "HUN",
        "ITA",
        "LIE",
        "SVK",
        "SVN",
        "CHE"
    ],
    "area": 83871.0
}
```

Захотите что-то поменять или улучшить, раскрасить, сделать поинтереснее, вывести дополнительную
информацию — всё на ваш вкус. Но желательно не переписывать всё полностью и делать это отдельными коммитами.
И сначала сделать основную задачу.

### Пример

Вводим Австрию и Болгарию, результат:
```
Austria → Hungary → Serbia → Bulgaria
Austria → Hungary → Romania → Bulgaria

Понадобилось всего 100500 запросов!
```

### Корнер-кейсы

API в некоторых случаях может вернуть ошибку, нужно уметь это обрабатывать, показать ошибку:
* https://restcountries.com/v3.1/alpha/
* https://restcountries.com/v3.1/alpha/bubu

Между странами может не быть маршрута (на островах), или маршрут слишком длинный (ограничимся 10 шагами).

### Советы

Изолируйте походы на бэк от кода приложения, пусть это будет чёрный ящик.

Не ходите дважды за одной и той же страной.

Сделайте метод для получения нескольких стран сразу. Под капотом можно
брать уже загруженные и ходить за недостающими.

Обратите внимание на доступность контролов, на время запросов можно дизейблить кнопку и инпуты,
показывать индикатор загрузки.

### По шагам

1) Сделайте _форк_ репозитория https://github.com/ipetropolsky/js-part-1
2) Склонируйте его к себе на машину, создайте ветку от master.
3) Запустите `npm install` или `yarn`, чтобы установить зависимости.
4) Запустите `npm run http-server` или `yarn http-server`, в консоли будет адрес, куда заходить.
5) Зайдите [на этот адрес](http://127.0.0.1:8080) в браузере, увидите html-ку с двумя инпутами и кнопкой.
6) Допишите недостающий код, обработайте разные ситуации. Всё максимально просто.
7) Сделайте пулл-реквест *в своём репозитории* и скиньте мне линк на него (ревьювером ставить не обязательно).
8) В пулл-реквесте добавьте несколько картинок, как ведёт себя ваше приложение в разных кейсах.
9) Если по ревью требуются изменения, сделайте их в том же PR отдельными коммитами, и пинганите меня снова.

### Если вы пропустили это в первой домашке

* Установите [NodeJs](https://nodejs.org/en/download/), если его нет.
* Установите [yarn](https://classic.yarnpkg.com/lang/en/docs/install/), если его нет (не обязательно, можно пользоваться `npm`).
* Включите в своём редакторе ESLint и реформат при сохранении, отключите JSHint и другие линтеры.

Некоторые правила `eslint`, которые мы обычно используем, отключены для удобства разработки.
Например, [`no-unused-vars`](https://eslint.org/docs/latest/rules/no-unused-vars), [`no-console`](https://eslint.org/docs/latest/rules/no-console), [`no-new-wrappers`](https://eslint.org/docs/latest/rules/no-new-wrappers).

### См. также:
* [Install Node.js on Windows Subsystem for Linux (WSL2)](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl)

### Бонусный уровень (необязательный)

В реальной жизни мы, конечно, не будем делать столько запросов. Давайте загрузим все страны с границами
за один раз и сделаем собственное _асинхронное_ API, которое будет доставать страну по её коду.
Например: `await getCountry(code)` или `getCountry(code).then(...)`.

Если походы на бэк у вас в чёрном ящике, то для приложения ничего не должно поменяться.
