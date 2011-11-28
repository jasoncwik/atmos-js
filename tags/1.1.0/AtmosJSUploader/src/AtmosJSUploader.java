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

import com.emc.esu.api.EsuException;
import com.emc.esu.api.ObjectPath;
import com.emc.esu.api.rest.EsuRestApi;
import com.emc.esu.api.rest.UploadHelper;
import org.apache.commons.cli.*;

import java.io.*;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AtmosJSUploader {

    public static void main( String[] args ) {
        Options options = new Options();
        Option o = new Option( "h", "host", true, "Atmos Access Point Host" );
        o.setRequired( true );
        options.addOption( o );

        o = new Option( "p", "port", true, "Atmos Access Point Port (Default 80)" );
        o.setRequired( false );
        options.addOption( o );

        o = new Option( "u", "uid", true, "Atmos UID" );
        o.setRequired( true );
        options.addOption( o );

        o = new Option( "s", "secret", true, "Atmos Shared Secret" );
        o.setRequired( true );
        options.addOption( o );

        o = new Option( "f", "file", true, "Local file path" );
        o.setRequired( true );
        options.addOption( o );

        o = new Option( "r", "remotedir", true, "Remote path to upload to.  Must be a directory (ends with a /)" );
        o.setRequired( false );
        options.addOption( o );

        // create the parser
        CommandLineParser parser = new GnuParser();
        try {
            // parse the command line arguments
            CommandLine line = parser.parse( options, args );

            AtmosJSUploader uploader = new AtmosJSUploader(
                    line.getOptionValue( "host" ),
                    Integer.parseInt( line.getOptionValue( "port", "80" ) ),
                    line.getOptionValue( "uid" ),
                    line.getOptionValue( "secret" )
            );


            URL u = uploader.processFile( line.getOptionValue( "file" ), line.getOptionValue( "remotedir" ) );

            System.out.println( "Access your file at: " + u );
        } catch ( ParseException exp ) {
            // oops, something went wrong
            System.err.println( "Parsing failed.  Reason: " + exp.getMessage() );
            // automatically generate the help statement
            HelpFormatter formatter = new HelpFormatter();
            formatter.printHelp( "AtmosJSUploader", options );
            System.exit( 1 );
        } catch ( EsuException e ) {
            e.printStackTrace();
            System.exit( 1 );
        } catch ( IOException e ) {
            e.printStackTrace();
            System.exit( 2 );
        } catch ( URISyntaxException e ) {
            e.printStackTrace();
        }
        System.exit( 0 );
    }

    private EsuRestApi esu;
    private File tempDir;

    public AtmosJSUploader( String host, int port, String uid, String secret ) throws IOException {
        this.esu = new EsuRestApi( host, port, uid, secret );
        tempDir = File.createTempFile( "tmp", ".dir" );
        tempDir.delete();
        tempDir.mkdirs();
    }

    public URL processFile( String filePath, String remoteDir ) throws IOException, URISyntaxException {
        File f = new File( filePath );
        if ( !f.exists() ) {
            throw new RuntimeException( "file " + filePath + " does not exist" );
        }
        if ( !remoteDir.endsWith( "/" ) ) remoteDir += "/";
        File localBaseDir = f.getParentFile();
        FileType fileType = FileType.fromExtension( getExtension( f ) );

        if ( fileType.isBinary() ) return uploadFile( f, remoteDir + f.getName() );
        else {

            // Read through the file and look for local file references to upload and then update the links
            File outFile = new File( tempDir, f.getName() );

            BufferedReader br = new BufferedReader( new FileReader( f ) );
            PrintWriter pw = new PrintWriter( new FileWriter( outFile ) );

            String line;
            Matcher matcher;
            while ( (line = br.readLine()) != null ) {
                if ( fileType.getLinkPatterns() != null ) {
                    for ( Pattern pattern : fileType.getLinkPatterns() ) {
                        matcher = pattern.matcher( line );
                        if ( matcher.matches() ) {
                            System.out.println( "Match: " + matcher );
                            String prefix = matcher.group( 1 ), linkPath = matcher.group( 2 ), suffix = matcher.group( 3 );
                            linkPath = processLinkedFile( localBaseDir, linkPath, remoteDir );

                            // new URL
                            line = prefix + linkPath + suffix;
                        }
                    }
                }
                pw.println( line );
            }

            pw.close();
            br.close();

            System.out.println( "Rewritten HTML in " + outFile );

            return uploadFile( outFile, remoteDir + f.getName() );
        }
    }

    private String processLinkedFile( File localBaseDir, String linkPath, String remotePath ) throws IOException, URISyntaxException {
        URI uri = new URI( linkPath );
        if ( uri.isAbsolute() ) {
            // Ignore
            System.out.println( "Ignoring absolute URI: " + uri );
            return linkPath;
        } else {
            // Upload and create a new URI
            File f = new File( localBaseDir, linkPath );
            if ( !f.exists() ) {
                System.out.println( "The child file " + f + " does not exist, skipping" );
                return linkPath;
            }

            // calculate new remote path
            remotePath = convertPathDelimiters( new File( remotePath + linkPath ).getParentFile().getPath() );

            URL u = processFile( f.getPath(), remotePath );

            return u.toString();
        }
    }

    private URL uploadFile( File f, String remotePath ) {
        if ( !f.exists() ) {
            throw new RuntimeException( "The file " + f + " does not exist" );
        }
        FileType fileType = FileType.fromExtension( getExtension( f ) );

        remotePath = removeDots( remotePath );

        System.out.println( "Uploading " + f.getPath() + " to " + remotePath );
        UploadHelper uh = new UploadHelper( esu );
        uh.setMimeType( fileType.getMimeType() );
        ObjectPath objectPath = new ObjectPath( remotePath );

        try {
            uh.createObjectOnPath( objectPath, f, null, null );
            if ( uh.isFailed() ) {
                throw uh.getError();
            }
        } catch ( Exception e ) {
            if ( e instanceof EsuException && ((EsuException) e).getAtmosCode() == 1016 ) {
                // Object already exists
                uh.updateObject( objectPath, f, null, null );
            } else {
                if ( e instanceof EsuException ) {
                    System.err.println( "Atmos Code: " + ((EsuException) e).getAtmosCode() );
                }
                e.printStackTrace();
                System.exit( 2 );
            }
        }

        // Create a shareable URL
        Calendar c = Calendar.getInstance();
        c.add( Calendar.YEAR, 40 );

        return esu.getShareableUrl( objectPath, c.getTime() );
    }

    private String getExtension( File f ) {
        String[] parts = f.getName().split( "\\." );
        if ( parts.length > 1 ) {
            return parts[parts.length - 1];
        }
        return null;
    }

    private String removeDots( String path ) {
        List<String> segments = new ArrayList<String>();
        segments.addAll( Arrays.asList( path.split( "/" ) ) );
        for ( int i = 0; i < segments.size(); i++ ) {
            String segment = segments.get( i );
            if ( segment.equals( ".." ) ) {
                // move this segment and the last
                segments.remove( i-- );
                segments.remove( i-- );
            }
        }
        path = "";
        for ( String segment : segments ) {
            path += segment + "/";
        }
        return path.substring( 0, path.length() - 1 );
    }

    private String convertPathDelimiters( String path ) {
        return path.replaceAll( "\\\\", "/" );
    }
}
