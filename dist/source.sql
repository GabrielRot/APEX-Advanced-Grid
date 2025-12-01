procedure p_render( p_plugin in            apex_plugin.t_plugin
                  , p_region in            apex_plugin.t_region
                  , p_param  in            apex_plugin.t_region_render_param
                  , p_result in out nocopy apex_plugin.t_region_render_result) as
  /* Variavel do tipo render result necessaria para retorno */
  vr_render_result apex_plugin.t_region_render_result;

  v_page_items_to_submit         varchar2(4000) := p_region.attributes.get_varchar2('ag_page_items_to_submit');

  c_static_id constant varchar2(4000) := apex_escape.html_attribute(p_region.static_id);
begin
  apex_css.add_file( p_name      => 'styles.min'
                   , p_directory => p_plugin.file_prefix
                   , p_version   => null
                   , p_key       => 'csagstylesource'
                   );

  apex_javascript.add_library( p_name      => 'scripts.min'
                             , p_directory => p_plugin.file_prefix
                             , p_version   => null
                             , p_key       => 'csagscriptsource'
                             );

  sys.htp.p('<div id="' || apex_plugin_util.escape(c_static_id, true) || '"></div>');

  apex_javascript.add_onload_code('
    const csAG' || replace(apex_plugin_util.escape(c_static_id, true), ' ', '_') || ' = new AgGrid(' || 
      apex_javascript.add_value(c_static_id, true) ||
      apex_javascript.add_value(apex_plugin.get_ajax_identifier, true) ||
      apex_javascript.add_value(v_page_items_to_submit, false) ||
  ')');

  p_result := vr_render_result;
end;

function bind_variable_value(pc_statement clob) return clob as
  vt_bind_names sys.dbms_sql.varchar2_table;

  vc_return clob;
begin
  /* funcao nao documentada para conseguir todos os bindings */
  vt_bind_names := wwv_flow_utilities.get_binds(pc_statement);

  vc_return := pc_statement;

  for i in 1..vt_bind_names.count loop
    vc_return := replace(vc_return, vt_bind_names(i), 'v(' || regexp_substr(vt_bind_names(i), '[^:]+', 1, 1) ||')');
  end loop;

  return vc_return;
end;

procedure P_AJAX( p_plugin in            apex_plugin.t_plugin
                , p_region in            apex_plugin.t_region
                , p_param  in            apex_plugin.t_region_ajax_param
                , p_result in out nocopy apex_plugin.t_region_ajax_result) as
  va_ajax_result apex_plugin.t_region_ajax_result;

  v_data_provider_type           p_plugin.attribute_01%type := p_plugin.attribute_01;
  v_function_returning_clob_json varchar2(4000)             := p_region.attributes.get_varchar2('ag_dpt_json');
 
  vc_data_provider_statement clob;
  vc_json_return             clob;
  
begin

  vc_json_return := apex_plugin_util.get_plsql_func_result_clob( p_plsql_function            => v_function_returning_clob_json);

  -- apex_plugin_util.execute_plsql_code(vc_data_provider_statement);

  apex_json.initialize_output;

  apex_json.open_object;
  
  apex_json.write('data', vc_json_return);
  apex_json.write('message', 'JSON data fetched successfully');
  apex_json.write('success', true);

  apex_json.close_object;

  p_result := null;
exception when others then
  apex_json.write('data', '');
  apex_json.write('message', sqlerrm);
  apex_json.write('success', false);
end;