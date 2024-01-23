public class MicrosoftAuthentication {
	
    @AuraEnabled
    public static ResponseWrapper getToken() {
        
        Sharepoint_Data__mdt defaultData = Sharepoint_Data__mdt.getInstance(SharepointConstants.MDT_INSTANCE);
        String endpoint = defaultData.Login_URL__c + defaultData.Site_Id__c + SharepointConstants.AUTH_PATH;

        String clientId = defaultData.Client_Id__c;
        String clientSecret = defaultData.Client_Secret__c;
        String scope = SharepointConstants.AUTH_SCOPE;
        String grantType = SharepointConstants.AUTH_GRANT_TYPE;

        String requestBody = 'client_id=' + EncodingUtil.urlEncode(clientId, SharepointConstants.AUTH_ENCODING_TYPE) +
                             '&scope=' + EncodingUtil.urlEncode(scope, SharepointConstants.AUTH_ENCODING_TYPE) +
                             '&grant_type=' + EncodingUtil.urlEncode(grantType, SharepointConstants.AUTH_ENCODING_TYPE) +
                             '&client_secret=' + EncodingUtil.urlEncode(clientSecret, SharepointConstants.AUTH_ENCODING_TYPE);

        HttpRequest request = new HttpRequest();
        request.setEndpoint(endpoint);
        request.setMethod(SharepointConstants.METHOD_POST);
        request.setHeader(SharepointConstants.AUTH_CT_HEADER, SharepointConstants.AUTH_CONTENT_TYPE);
        request.setBody(requestBody);

        
        Http http = new Http();
        HttpResponse response = http.send(request);

        if (response.getStatusCode() == 200) {
            String jsonResponse = response.getBody();
            System.debug('Token response: ' + jsonResponse);
            ResponseWrapper res = (ResponseWrapper) JSON.deserialize(jsonResponse, ResponseWrapper.class);
            System.debug('Token response: ' + res.access_token);
            res.graphURL = defaultData.Graph_URL__c;
            res.driveId = defaultData.Drive_Id__c;
            system.debug('Res ' + res);
            return res;
        } else {
            // Handle error response
            System.debug('Error response: ' + response.getBody());
            throw new AuraHandledException('Authentication Failed');
            
        }
    }
    

    public class ResponseWrapper{
        @AuraEnabled
        public String access_token;
        @AuraEnabled
        public String graphURL;
        @AuraEnabled
        public String driveId;
    }
}