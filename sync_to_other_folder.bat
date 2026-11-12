@echo off
echo Syncing updated frontend and backend files to 'D:\smart drainage and waterlogging'...
xcopy /E /I /Y "frontend" "D:\smart drainage and waterlogging\frontend"
xcopy /E /I /Y "backend" "D:\smart drainage and waterlogging\backend"
copy /Y "app.py" "D:\smart drainage and waterlogging\app.py"
copy /Y "start.bat" "D:\smart drainage and waterlogging\start.bat"
echo Sync complete!
pause

