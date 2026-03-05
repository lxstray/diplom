- автокомплит для остальных языков
- завезти поддрежку гит для версионирования 
- настроить дополнительное потверждение регистрации
- доделать регистрацию через google github
- добавить проверку что б не зарегистророванный пользователь не мог подключится
- если комнаты не существует, то к ней все равно можно подключится 
- добавить даш борд на главную страницу
- сделать так что бы уведомления об ошибках проподали
- добавить историю комнат
- добавить возможность создавать проекты на определенном языке(с готовой структурой папок и тд)
- на данный момент запускаеться только один файл, сделать что бы могли запускаться целые проекты
- на данный момент поддерживается только js, добоваить запуск других языков.
- сделать так что бы если один выполнил программу, другой видит резульатат это программы
- сделать нома иконки для файлов с автоопределением
- добавить озможность растягивать панели, хотябы панель консоли снизу
- добавить точку надо чатом, если он закрыт, что пришло сообщение 



на некст день задачи:
- починить подключение 
- добавить историю комнат на главную страницу
- починить  что при выходе с проекта ты возвращаешся на старую версию мэйн страницы, а не к задачам






 npm run dev EXERCISM_ROOT=~/pers/diplom/exercism/javascript

cd /home/snxwlv/pers/diplom && docker compose -f docker/judge0.docker-compose.yml ps && docker compose -f docker/judge0.docker-compose.yml logs --tail=80 server worker
Commands (from repo root)
cd /home/snxwlv/pers/diplom
Start (or restart) Judge0 stack:
docker compose -f docker/judge0.docker-compose.yml up -d
Stop containers (keep DB volume):
docker compose -f docker/judge0.docker-compose.yml stop
Stop + remove containers (keep DB volume):
docker compose -f docker/judge0.docker-compose.yml down
Stop + remove containers + delete DB data volume (full reset):
docker compose -f docker/judge0.docker-compose.yml down -v
View status:
docker compose -f docker/judge0.docker-compose.yml ps

