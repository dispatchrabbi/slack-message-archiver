<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html"/>

  <xsl:template match="/">
    <html>
		<head>
			<title>Slack archive of <xsl:value-of select="/history/channel" /> from <xsl:value-of select="/history/from" /> to <xsl:value-of select="/history/to" /></title>
			<style>
				/* http://meyerweb.com/eric/tools/css/reset/ 
				   v2.0 | 20110126
				   License: none (public domain)
				*/

				html, body, div, span, applet, object, iframe,
				h1, h2, h3, h4, h5, h6, p, blockquote, pre,
				a, abbr, acronym, address, big, cite, code,
				del, dfn, em, img, ins, kbd, q, s, samp,
				small, strike, strong, sub, sup, tt, var,
				b, u, i, center,
				dl, dt, dd, ol, ul, li,
				fieldset, form, label, legend,
				table, caption, tbody, tfoot, thead, tr, th, td,
				article, aside, canvas, details, embed, 
				figure, figcaption, footer, header, hgroup, 
				menu, nav, output, ruby, section, summary,
				time, mark, audio, video {
					margin: 0;
					padding: 0;
					border: 0;
					font-size: 100%;
					font: inherit;
					vertical-align: baseline;
				}
				/* HTML5 display-role reset for older browsers */
				article, aside, details, figcaption, figure, 
				footer, header, hgroup, menu, nav, section {
					display: block;
				}
				body {
					line-height: 1;
				}
				ol, ul {
					list-style: none;
				}
				blockquote, q {
					quotes: none;
				}
				blockquote:before, blockquote:after,
				q:before, q:after {
					content: '';
					content: none;
				}
				table {
					border-collapse: collapse;
					border-spacing: 0;
				}				
				/* end reset */
				
				body {
					padding: 25px;
					font: normal 12px arial, sans-serif;
					background-color: #f5f5f5;
				}
				
				em {
					font-style: italic;
				}
				
				strong {
					font-style: bold;
				}
				
				h1 {
					font-weight: bold;
					font-size: 24px;
					padding-bottom: 5px;
				}
				
				h2 {
					font-size: 18px;
					font-style: italic;
					padding-bottom: 5px;
				}
				
				#wrap {
					padding: 15px;
					border-radius: 5px;
					border: solid 3px #bbb;
					max-width: 1000px;
					background-color: #fff;
				}
				
				table {
					border-collapse: collapse;
					border-width: 0;
				}
				
				td {
					vertical-align: top;
					line-height: 1.3;
				}
				
				.user {
					font-weight: bold;
					font-size: 14px;
					padding-right: 10px;
				}
				
				.formatted-date {
					vertical-align: middle;
				}
				
				.user, .formatted-date {
					padding-top: 8px;
				}

				.profile-image, .message {
					border-bottom: dotted 1px #ddd;
					padding-bottom: 8px;
				}
				
				.message {
					white-space: pre-line;
				}				
				
				.profile-image img {
					border-radius: 3px;
				}
				
				.formatted-date {
					color: #999;
					font-size: 10px;
				}
			</style>
		</head>
		<body>
			<div id="wrap">
				<h1>Slack: <xsl:value-of select="/history/channel" /></h1>
				<h2>Archive of <em><xsl:value-of select="/history/from" /></em> to <em><xsl:value-of select="/history/to" /></em></h2>
				<table>
					<xsl:apply-templates />			
				</table>
			</div>
		</body>
	</html>
  </xsl:template>

  <!-- hide -->
  <xsl:template match="history/channel"></xsl:template>
  <xsl:template match="history/from"></xsl:template>
  <xsl:template match="history/to"></xsl:template>
  <xsl:template match="history/fileCount"></xsl:template>
  
  <xsl:template match="messages/message">
	<xsl:param name="profileImage" select="profile_image"/>
	<xsl:param name="filePath" select="file_path"/>	
    <tr>
		<td class="user"><xsl:value-of select="user" /></td>
		<td class="formatted-date"><xsl:value-of select="formatted_date" /></td>
	</tr>
	<tr>
		<td class="profile-image"><img src="{$profileImage}" width="32" height="32" alt="" /></td>
		<td class="message">
			<xsl:value-of select="text" disable-output-escaping="yes" />
			<xsl:if test="file_path">							
				<a href="{$filePath}"><xsl:value-of select="file_label" /></a>
			</xsl:if>
		
		</td>
	</tr>
  </xsl:template>

</xsl:stylesheet>