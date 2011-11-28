/*

 Copyright (c) 2011, EMC Corporation

 All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the EMC Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
import java.util.regex.Pattern;

/**
 * Each RegEx must define three capture groups: a prefix, link and suffix.  The link will be process and evaluated (if
 * appropriate), but the prefix and suffix will stay the same. Any text included in the RegEx that is not in a capture
 * group will be deleted.
 */
public enum FileType {
    HTML( "html", "text/html", false, new Pattern[]{Pattern.compile( "(.* href=\"|.* src=\")([^\")]+)(\".*)" )} ),
    JS( "js", "text/javascript", false, null ),
    CSS( "css", "text/css", false, new Pattern[]{Pattern.compile( "(.*: *url\\( *\"?)([^\")]+)(\"? *\\).*)" )} ),
    XML( "xml", "text/xml", false, new Pattern[]{Pattern.compile( "(.* href=\"|.* src=\")([^\")]+)(\".*)" )} ),
    JPG( "jpg", "image/jpeg", true, null ),
    JPEG( "jpeg", "image/jpeg", true, null ),
    GIF( "gif", "image/gif", true, null ),
    PNG( "png", "image/png", true, null ),
    DEFAULT( null, "application/octet-stream", true, null );

    public static FileType fromExtension( String extension ) {
        for ( FileType fileType : FileType.values() ) {
            if ( fileType.getExtenstion() != null && fileType.getExtenstion().equals( extension ) ) return fileType;
        }
        return DEFAULT;
    }

    private String extenstion;
    private String mimeType;
    private boolean binary;
    private Pattern[] linkPatterns;

    private FileType( String extension, String mimeType, boolean binary, Pattern[] linkPatterns ) {
        this.extenstion = extension;
        this.mimeType = mimeType;
        this.binary = binary;
        this.linkPatterns = linkPatterns;
    }

    public String getExtenstion() {
        return this.extenstion;
    }

    public String getMimeType() {
        return this.mimeType;
    }

    public boolean isBinary() {
        return this.binary;
    }

    public Pattern[] getLinkPatterns() {
        return this.linkPatterns;
    }
}