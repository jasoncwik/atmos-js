#!/bin/sh

# usage: ./upload.sh local.file /remote/path

# specify location of jar here
export UPLOAD_JAR=~/Projects/AtmosJSUploader/JSUpload.jar

#specify your service credentials here
export HOST=lciga090.lss.emc.com
export xUID=0bc871f97086456db2e803ccc172ccec/stu
export SECRET=

java -jar $UPLOAD_JAR -h $HOST -u $xUID -s $SECRET -f $1 -r $2
