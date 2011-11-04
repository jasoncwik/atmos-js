public enum FileType {
    HTML( "html", "text/html", false ),
    JS( "js", "text/javascript", false ),
    CSS( "css", "text/css", false ),
    XML( "xml", "text/xml", false ),
    JPG( "jpg", "image/jpeg", true ),
    JPEG( "jpeg", "image/jpeg", true ),
    GIF( "gif", "image/gif", true ),
    PNG( "png", "image/png", true );

    public static FileType fromExtension( String extension ) {
        for ( FileType fileType : FileType.values() ) {
            if ( fileType.getExtenstion().equals( extension ) ) return fileType;
        }
        return null;
    }

    private String extenstion;
    private String mimeType;
    private boolean binary;

    private FileType( String extension, String mimeType, boolean binary ) {
        this.extenstion = extension;
        this.mimeType = mimeType;
        this.binary = binary;
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
}