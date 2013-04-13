#!/bin/sh
if [ -z "$2" ]
then
  echo usage: "$0 <local_html_file> /remote_path"
  exit 1
fi

# set jar location here
UPLOAD_JAR=./JSUpload.jar

echo "Atmos hostname: \c"
read HOST

echo "Atmos port [80]: \c"
read PORT
if [ -z "$PORT" ]
then
  PORT=80
fi

echo "Atmos UID: \c"
read xUID

echo "Atmos secret: \c"
read SECRET

java -jar $UPLOAD_JAR -h $HOST -p $PORT -u $xUID -s $SECRET -f $1 -r $2
