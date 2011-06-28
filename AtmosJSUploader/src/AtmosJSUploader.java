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
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.Calendar;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.GnuParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;

import com.emc.esu.api.EsuApi;
import com.emc.esu.api.EsuException;
import com.emc.esu.api.ObjectPath;
import com.emc.esu.api.rest.EsuRestApi;
import com.emc.esu.api.rest.UploadHelper;


public class AtmosJSUploader {

	/**
	 * @param args
	 */
	public static void main(String[] args) {
		Options options = new Options();
		Option o = new Option("u", "uid", true, "Atmos UID");
		o.setRequired(true);
		options.addOption(o);
		
		o = new Option("s", "secret", true, "Atmos Shared Secret");
		o.setRequired(true);
		options.addOption(o);
		
		o = new Option("h", "host", true, "Atmos Access Point Host");
		o.setRequired(true);
		options.addOption(o);
		
		o = new Option("p", "port", true, "Atmos Access Point Port (Default 80)");
		o.setRequired(false);
		options.addOption(o);
		
		o = new Option("f", "file", true, "Local file path");
		o.setRequired(true);
		options.addOption(o);
		
		o = new Option("r", "remotedir", true, "Remote path to upload to.  Must be a directory (ends with a /)");
		o.setRequired(false);
		options.addOption(o);
		
		// create the parser
	    CommandLineParser parser = new GnuParser();
	    try {
	        // parse the command line arguments
	        CommandLine line = parser.parse( options, args );
	        String uid = line.getOptionValue( "uid" );
	        String secret = line.getOptionValue( "secret" );
	        String host = line.getOptionValue( "host" );
	        int port = Integer.parseInt(line.getOptionValue("port", "80"));
	        String file = line.getOptionValue("file");
	        String remotedir = line.getOptionValue("remotedir");
	        
			ObjectPath objectpath = new ObjectPath(remotedir);
			
			if( !objectpath.isDirectory() ) {
				throw new RuntimeException( "remote path must be a directory" );
			}
						
			EsuApi esu = new EsuRestApi(host, port, uid, secret);

			URL u = null;
			// Look for other files to upload
			if( file.endsWith(".html") ) {
				u = uploadHtml( file, objectpath, esu );
			} else {
				u = uploadFile( file, objectpath, esu );
			}
			
			System.out.println( "Access your file at: " + u );
	    }
	    catch( ParseException exp ) {
	        // oops, something went wrong
	        System.err.println( "Parsing failed.  Reason: " + exp.getMessage() );
	     // automatically generate the help statement
	        HelpFormatter formatter = new HelpFormatter();
	        formatter.printHelp( "AtmosJSUploader", options );
	        System.exit(1);
	    } catch( EsuException e ) {
	    	e.printStackTrace();
	    	System.exit(1);
	    } catch (IOException e) {
			e.printStackTrace();
			System.exit(2);
		} catch (URISyntaxException e) {
			e.printStackTrace();
		}
	    System.exit(0);
	}

	private static URL uploadHtml(String file, ObjectPath objectpath,
			EsuApi esu) throws IOException, URISyntaxException {
		// Read through the HTML and look for local JS and CSS files to upload and then update the links
		File f = new File(file);
		File tmpDir = File.createTempFile("tmp", ".dir");
		File outFile = new File(tmpDir, f.getName());
		
		tmpDir.delete();
		tmpDir.mkdirs();
		
		BufferedReader br = new BufferedReader( new FileReader(f) );
		PrintWriter pw = new PrintWriter( new FileWriter(outFile) );
		
		Pattern cssInclude = Pattern.compile( "(<link.*href=\")(.*\\.css)(\".*)" );
		Pattern jsInclude = Pattern.compile( "(<script type=\"text/javascript\" src=\")(.*)(\".*)" );
		
		String line = null;
		while( (line = br.readLine()) != null ) {
			if( cssInclude.matcher(line).matches() ) {
				Matcher m = cssInclude.matcher(line);
				System.out.println("CSS Match: " + m);
				
				handleMatch( f, pw, line, m, file, objectpath, esu );

			} else if( jsInclude.matcher(line).matches() ) {
				Matcher m = jsInclude.matcher(line);
				
				handleMatch( f, pw, line, m, file, objectpath, esu );
			} else {
				pw.println( line );
			}
		}
		
		pw.close();
		br.close();
		
		System.out.println( "Rewritten HTML in " + outFile);
		
		return uploadFile(outFile, file, objectpath, esu);
	}

	private static void handleMatch(File parent, PrintWriter pw, String line, Matcher m, String file,
			ObjectPath objectpath, EsuApi esu) throws URISyntaxException {
		m.matches();
		String pre = m.group(1);
		String fn = m.group(2);
		String post = m.group(3);
		
		URI uri = new URI(fn);
		if( uri.isAbsolute() ) {
			// Ignore
			System.out.println( "Ignoring absolute URI: " + uri );
			pw.println(line);
			return;
		} else {
			// Upload and create a new URI
			File f = new File( parent.getParentFile(), fn );
			if( !f.exists() ) {
				System.out.println( "The child file " + f + " does not exist, skipping" );
				pw.println(line);
				return;
			}

			URL u = uploadFile( f, fn, objectpath, esu );
			
			// Print out new URL
			pw.println( pre + u + post );

		}
	}

	private static URL uploadFile(String file, ObjectPath objectpath,
			EsuApi esu) {
		File f = new File(file);
		return uploadFile(f, file, objectpath, esu);
	}
	
	private static URL uploadFile(File f, String filename, ObjectPath objectpath,
				EsuApi esu) {
		if( !f.exists() ) {
			throw new RuntimeException( "The file " + f + " does not exist" );
		}
		
		ObjectPath uploadpath = new ObjectPath(objectpath + filename);
		
		System.out.println( "Uploading " + filename + " to " + uploadpath );
		UploadHelper uh = new UploadHelper(esu);
		
		if( f.getName().endsWith( ".html" ) ) {
			uh.setMimeType("text/html");
		} else if( f.getName().endsWith( ".js" ) ) {
			uh.setMimeType("text/javascript");
		} else if( f.getName().endsWith( ".css" ) ) {
			uh.setMimeType("text/css");
		}
		
		try {
			uh.createObjectOnPath(uploadpath, f, null, null);	
			if( uh.isFailed() ) {
				throw uh.getError();
			}
		} catch( Exception e ) {
			if( e instanceof EsuException && ((EsuException)e).getAtmosCode() == 1016 ) {
				// Object already exists
				uh.updateObject(uploadpath, f, null, null);
			} else {
				if( e instanceof EsuException ) {
					System.err.println( "Atmos Code: " + ((EsuException)e).getAtmosCode());
				}
				e.printStackTrace();
				System.exit(2);
			}
		}
		
		// Create a shareable URL
		Calendar c = Calendar.getInstance();
		c.add(Calendar.YEAR, 40);

		return esu.getShareableUrl(uploadpath, c.getTime());
		
	}

}
