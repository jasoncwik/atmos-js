@echo off
setlocal
if "%2" == "" goto usage

set /p HOST=Atmos hostname: 
set /p PORT=Atmos port [80]: 
if "%PORT%" == "" set PORT=80
set /p xUID=Atmos UID: 
set /p SECRET=Atmos secret: 

java -jar JSUpload.jar -h %HOST% -p %PORT% -u %xUID% -s %SECRET% -f %1 -r %2
endlocal
goto end

:usage
echo usage: %0 html_file /remote_path

:end
