#Uploads HTML applications to Atmos

# Introduction #

One of the easiest ways to use JavaScript communication with Atmos is to run the HTML application within the storage itself.  The AtmosJSUploader utility will read your HTML (or any configured text file), look for links that exist relative to the base file and upload them as shareable URLs.  The links will then be rewritten and the new HTML uploaded.  This process is recursive, so CSS url() references are covered.  At the end of the process, you will be given a shareable URL to access your application with.  By default, all of the links will be good for 40 years.

# Details #

```
MBP2:AtmosJS cwikj$ java -jar ~/JSUpload.jar 
Parsing failed.  Reason: Missing required options: u, s, h, f
usage: AtmosJSUploader
 -f,--file <arg>        Local file path
 -h,--host <arg>        Atmos Access Point Host
 -p,--port <arg>        Atmos Access Point Port (Default 80)
 -r,--remotedir <arg>   Remote path to upload to.  Must be a directory
                        (ends with a /)
 -s,--secret <arg>      Atmos Shared Secret
 -u,--uid <arg>         Atmos UID
```

# Example #

The following example shows the upload of the unit test HTML (testcases.html)

```
MBP2:AtmosJS cwikj$ java -jar /Users/cwikj/JSUpload.jar -h lciga070.lss.emc.com -p 80 -u bb1d64e2c2be41a9a33106a6a2b36723/atmosjs -s im2GKDI8X2cn8r/Dd/h6588uqaw= -f testcases.html -r /atmosjs/
Uploading nodeunit/nodeunit.css to /atmosjs/nodeunit/nodeunit.css
Ignoring absolute URI: http://code.jquery.com/jquery-1.6.1.js
Uploading lib/crypto.js to /atmosjs/lib/crypto.js
Uploading lib/hmac.js to /atmosjs/lib/hmac.js
Uploading lib/sha1.js to /atmosjs/lib/sha1.js
Uploading atmos-js.js to /atmosjs/atmos-js.js
Uploading nodeunit/nodeunit.js to /atmosjs/nodeunit/nodeunit.js
Uploading tests/atmos-config.js to /atmosjs/tests/atmos-config.js
Uploading tests/lowlevel.js to /atmosjs/tests/lowlevel.js
Uploading tests/atmosapi.js to /atmosjs/tests/atmosapi.js
Rewritten HTML in /var/folders/-Q/-Qj1+OlnFZSXVjRE72CGi++++TI/-Tmp-/tmp4376105456495474630.dir/testcases.html
Uploading testcases.html to /atmosjs/testcases.html
Access your file at: http://lciga070.lss.emc.com/rest/namespace/atmosjs/testcases.html?uid=bb1d64e2c2be41a9a33106a6a2b36723%2Fatmosjs&expires=2571596468&signature=a4dAyWWpyyv6qrqECjodZ6PPpGg%3D
```

# upload.sh #

a [script](http://atmos-js.googlecode.com/svn/tags/1.1.0/AtmosJSUploader/upload.sh) exists in the source repository to make life a little easier for you.  It assumes JSUpload.jar is in the current directory.

```
upload.sh my_app.html /remote/path
```