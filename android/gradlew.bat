@rem Gradle wrapper script for Windows
@if "%DEBUG%" == "" @echo off
@rem Set local scope for variables
setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

echo ERROR: JAVA_HOME is not set. >&2
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME% >&2
goto fail

:execute
@rem Setup the command line
set CLASSPATH=%DIRNAME%\gradle\wrapper\gradle-wrapper.jar

@rem Execute Gradle
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% ^
  "-Dorg.gradle.appname=%APP_BASE_NAME%" ^
  -classpath "%CLASSPATH%" ^
  org.gradle.wrapper.GradleWrapperMain %*

:fail
rem Return error code
exit /b 1
