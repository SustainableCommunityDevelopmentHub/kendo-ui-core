using Kendo.Mvc.Extensions;
using Microsoft.AspNet.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Kendo.Mvc.UI
{
    /// <summary>
    /// Kendo UI TreeViewMessagesSettings class
    /// </summary>
    public partial class TreeViewMessagesSettings 
    {
        public string Loading { get; set; }

        public string RequestFailed { get; set; }

        public string Retry { get; set; }


        public TreeView TreeView { get; set; }

        protected Dictionary<string, object> SerializeSettings()
        {
            var settings = new Dictionary<string, object>();

            if (Loading?.HasValue() == true)
            {
                settings["loading"] = Loading;
            }

            if (RequestFailed?.HasValue() == true)
            {
                settings["requestFailed"] = RequestFailed;
            }

            if (Retry?.HasValue() == true)
            {
                settings["retry"] = Retry;
            }

            return settings;
        }
    }
}
