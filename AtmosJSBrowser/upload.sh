#!/bin/sh
if [ -z "$2" ]
then
  echo usage: "$0 <local_html_file> <remote_path>"
  echo typical remote path is /browser
  exit 1
fi

# set these to avoid typing
export HOST=
export PORT=
export xUID=
export SECRET=

# set jar location here
UPLOAD_JAR=./JSUpload.jar

if [ -z "$HOST" ]; then
  echo "Atmos hostname: \c"
  read HOST
fi

if [ -z "$PORT" ]; then
  echo "Atmos port [80]: \c"
  read PORT
  if [ -z "$PORT" ]
  then
    PORT=80
  fi
fi

if [ -z "$xUID" ]; then
  echo "Atmos UID: \c"
  read xUID
fi

if [ -z "$SECRET" ]; then
  echo "Atmos secret: \c"
  read SECRET
fi

java -jar $UPLOAD_JAR -h $HOST -p $PORT -u $xUID -s $SECRET -f $1 -r $2
